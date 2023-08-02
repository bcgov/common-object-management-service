const { NIL: SYSTEM_USER, v4: uuidv4, validate: uuidValidate } = require('uuid');

const log = require('../components/log')(module.filename);
const { ObjectModel, Version } = require('../db/models');
const utils = require('../db/models/utils');
const {
  toLowerKeys
} = require('../components/utils');

const objectService = require('./object');
const storageService = require('./storage');
const tagService = require('./tag');
const versionService = require('./version');

/**
 * The Sync Service
 * sync data between object storage and the COMS database
 */
const service = {
  /**
   * @function syncJob
   * Orchestrates the synchronization of all aspects of a specified object
   * @param {string} options.path String representing the canonical path for the specified object
   * @param {string} [options.bucketId=undefined] Optional uuid for the specified object
   * @param {boolean} [options.full=false] Optional boolean indicating whether to execute full recursive run
   * @param {string} [options.userId=SYSTEM_USER] Optional uuid attributing which user added the job
   * @returns
   * @throws If the synchronization job encountered an error
   */
  syncJob: async ({ path, bucketId = undefined, full = false, userId = SYSTEM_USER } = {}) => {
    try {
      if (!path) throw new Error('Path must be defined');
      // nested array of all synced data
      const response = [];

      // strat db transaction
      await utils.trxWrapper(async (trx) => {

        // 1. sync object
        const object = await service.syncObject({ path: path, bucketId: bucketId, userId: userId }, trx);
        response.push(object);

        // 2. sync versions of object
        let versions = [];
        // if new object was created in COMS DB in step 1
        // OR doing 'full' sync and object wasn't deleted
        if (object?.newObject || (object && full)) {
          versions = await service.syncVersions({ objectId: object.id, userId: userId }, trx);
          // console.log('syncJob versions:', versions);
          response[0].versions = versions;
        }

        // 3. sync tags and metadata for each version
        for (const version of versions) {
          const tagset = [];
          // if
          if (version.newVersion || full) {
            // sync tags
            const tags = await service.syncTags({
              version: version,
              path: path,
              bucketId: bucketId,
              objectId: object.id,
              userId: userId
            }, trx);
            tagset.push(tags);
          }
          // add to final array
          response[0].versions.find(v => v.id === version.id).tagset = tagset;
        }

        // console.log('sync response:', response[0].versions[0].tagset);
        return response;
      });
    }
    catch (err) {
      log.error(err, { function: 'syncJob' });
      throw err;
    }
  },


  /**
   * @function syncObject
   * syncs object-level data
   * @param {string} [options.path] The path of object in sync job
   * @param {string} [options.bucketId] The uuid bucketId of object in sync job
   * @param {string} [options.userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {object} synced objects that exist in COMS and S3 eg:
   * <ObjectModel> (synced object)
   * or `undefined` (when object was pruned from COMS db after sync)
   */
  syncObject: async ({ path, bucketId, userId = SYSTEM_USER }, etrx = undefined) => {
    let trx, response;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();
      // await call to look for object in both the COMS db and S3
      const [comsObjectPromise, s3ObjectPromise] = await Promise.allSettled([
        // COMS object
        ObjectModel.query(trx).first().where({ path: path, bucketId: bucketId }),
        // S3 object
        storageService.headObject({ filePath: path, bucketId: bucketId })
          .catch((e) => {
            // return true if object is soft-deleted in S3
            return e?.$response.headers['x-amz-delete-marker'];
          })
      ]);
      const comsObject = comsObjectPromise.value;
      const s3Object = s3ObjectPromise.value;

      // console.log('syncObject comsObject:', comsObject);
      // console.log('syncObject s3Object:', s3Object);

      // // if already in sync
      if (comsObject && s3Object) response = comsObject;

      // 1. insert object
      // if not in COMS db and exists in S3
      if (!comsObject && s3Object) {
        // get coms-id tag from S3 if exists
        const s3Obj = await storageService.getObjectTagging({ filePath: path, bucketId: bucketId });
        const s3ObjectComsId = s3Obj.TagSet.find(obj => (obj.Key === 'coms-id'))?.Value;
        let comsId, hadComsIdTag = false;
        if (s3ObjectComsId && uuidValidate(s3ObjectComsId)) {
          comsId = s3ObjectComsId;
          hadComsIdTag = true;
        } else {
          comsId = uuidv4();
        }

        // create object in COMS db
        response = await objectService.create({
          id: comsId,
          name: path.match(/(?!.*\/)(.*)$/)[0], // get `name` column
          path: path,
          bucketId: bucketId,
          userId: userId
        }, trx);
        // add newObject attribute to check for syncVersions behaviour
        response.newObject = true;

        // Add new coms-id tag to object in S3 if it ddn't have one before sync
        if (!hadComsIdTag) await storageService.putObjectTagging({ filePath: path, bucketId: bucketId, tags: [{ Key: 'coms-id', Value: comsId }] });
      }

      // 2. or delete object
      // object exists in COMS db but not on S3
      if (comsObject && !s3Object) {
        // delete object and all child records from COMS db
        await objectService.delete(comsObject.id, trx);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function syncVersions
   * syncs version-level data
   * @param {object} [options.objectId] the parent object uuid
   * @param {string} [options.userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {object[]} array of synced versions that exist in COMS and S3 eg:
   * [ <Version>, <Version> ]
   */
  syncVersions: async ({ objectId, userId = SYSTEM_USER }, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // COMS object record
      const object = await ObjectModel.query(trx).first().where({ id: objectId });

      // --- get COMS versions
      const comsVs = await Version.query(trx).modify('filterObjectId', object.id).orderBy('createdAt', 'desc');

      // --- get S3 versions (merge Versions and DeleteMarkers into one array)
      const s3Obj = await storageService.listObjectVersion({ filePath: object.path, bucketId: object.bucketId });
      const s3Versions = s3Obj.Versions ? s3Obj.Versions : [];
      // add DeleteMarker property to identify
      const s3DeleteMarkers = s3Obj.DeleteMarkers ? s3Obj.DeleteMarkers.map(dm => ({ DeleteMarker: true, ...dm })) : [];
      const s3Vs = s3Versions.concat(s3DeleteMarkers);
      // console.log('syncVersions comsVs:', comsVs);
      // console.log('syncVersions s3Vs:', s3Vs);

      // ---- do differential logic between COMS versions (comsVs) and S3 versions (s3Vs)
      // 1. delete versions not in S3
      for (const comsV of comsVs) {
        if (comsV.s3VersionId && !s3Vs.some((s3V) => (s3V.VersionId === comsV.s3VersionId))) {
          await versionService.delete(object.id, (comsV.s3VersionId ?? null), trx);
          // TODO (optional): remove this item from comsVs array
        }
      }

      // 2. insert and update versions
      let syncedVersions = [];
      for (const s3V of s3Vs) {
        // console.log('s3V:', s3V);
        // if a versioned object (ie: if VersionId is not not 'null')
        if (s3V.VersionId !== 'null') {
          // if version in COMS db
          const comsV = comsVs.find((comsV) => (comsV.s3VersionId === s3V.VersionId));
          if (comsV) {
            // console.log('comsV.id:', comsV.id);
            // if isLatest in s3V, patch with isLatest
            if (s3V.IsLatest) {
              const updated = await versionService.updateIsLatest({ id: comsV.id, objectId: object.id, isLatest: s3V.IsLatest }, trx);
              // do not mark as newVersion, no need to sync Tags/Meta
              syncedVersions.push(updated[0]);
            }
            // version record not modified
            else {
              syncedVersions.push(comsV);
            }
            // console.log('syncedVersions:', syncedVersions);
          }
          // else not found in db
          else {
            // get mimeType for new version
            const mimeType = s3V.DeleteMarker ? undefined : await storageService.headObject({ filePath: object.path, s3VersionId: s3V.VersionId, bucketId: object.bucketId }).then((obj => {
              return obj.ContentType ?? null;
            }));

            // insert into db and set to latest
            const newVersion = await versionService.create({
              s3VersionId: s3V.VersionId,
              mimeType: mimeType,
              id: object.id,
              deleteMarker: s3V.DeleteMarker,
              etag: s3V.ETag,
              isLatest: s3V.IsLatest
            }, userId, trx);
            // console.log('newVersion:', newVersion);

            syncedVersions.push({ ...newVersion, newVersion: true });
          }
        }
        // else S3 object is in non-versioned bucket
        else {
          // get mimeType of S3 version
          const mimeType = await storageService.headObject({ filePath: object.path, bucketId: object.bucketId }).then((obj => {
            return obj.ContentType;
          }));

          // get existing version
          const existingVersion = comsVs[0];

          // if no existing version found
          if (!existingVersion) {
            const newVersion = await versionService.create({
              s3VersionId: s3V.VersionId,
              mimeType: mimeType,
              id: object.id,
              etag: s3V.ETag,
              isLatest: true
            }, userId, trx);
            // console.log('newVersion:', newVersion);
            syncedVersions.push({ ...newVersion, newVersion: true });
          }

          // if latest version has different etag or mimetype
          else if (existingVersion.mimeType !== mimeType || existingVersion.etag !== s3V.ETag) {
            // update latest version
            const updatedVersion = await versionService.update({
              mimeType: mimeType,
              id: object.id,
              etag: s3V.ETag,
              isLatest: true
            }, userId, trx);
            // console.log('updatedVersion:', updatedVersion);
            syncedVersions.push({ ...updatedVersion, newVersion: true });
          }
          // version record not modified
          else {
            syncedVersions.push(existingVersion);
          }
        }
      }

      if (!etrx) await trx.commit();
      return syncedVersions;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }

  },

  /**
   *
   */
  syncTags: async ({ version, path, bucketId, objectId, userId }, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // get COMS tags
      console.log(version.id);
      const ComsTagsForVersion = await tagService.fetchTagsForVersion({ versionIds: version.id });
      const comsTags = ComsTagsForVersion[0]?.tagset ?? [];

      // get S3 tags
      const S3TagsForVersion = await storageService.getObjectTagging({ filePath: path, s3VersionId: version.s3VersionId, bucketId: bucketId });
      const S3Tags = S3TagsForVersion?.TagSet.length > 0 ? toLowerKeys(S3TagsForVersion?.TagSet) : [];
      // console.log('syncTags comsTags:', comsTags);
      // console.log('syncTags S3Tags:', S3Tags);

      // ensure `coms-id` tag exists on this version in S3
      if (!S3Tags.find((s3T) => (s3T.key === 'coms-id'))) {
        await storageService.putObjectTagging({ filePath: path, bucketId: bucketId, tags: [{ Key: 'coms-id', Value: objectId }] });
        // add to our arrays for comaprison
        S3Tags.push({ key: 'coms-id', value: objectId });
      }

      // ---- do differential logic between COMS tags (comsTags) and S3 tags (S3Tags)
      // 1. dissociate tags not in S3
      let oldTags = [];
      for (const comsT of comsTags) {
        if (!S3Tags.some((s3T) => (s3T.key === comsT.key && s3T.value === comsT.value))) {
          oldTags.push(comsT);
        }
      }
      console.log('oldTags', oldTags);
      if (oldTags.length > 0) await tagService.dissociateTags(version.id, oldTags, trx);

      // 2. associate new tags
      let syncedTags = [];
      let newTags = [];
      for (const s3T of S3Tags) {
        if (!comsTags.some((comsT) => (comsT.key === s3T.key && comsT.value === s3T.value))) {
          newTags.push(s3T);
        } else {
          syncedTags.push(s3T);
        }
      }
      if (newTags.length > 0) {
        console.log('newTags', newTags);
        await tagService.associateTags(version.id, newTags, userId, trx);
        syncedTags.concat(newTags);
      }
      console.log('syncedTags', syncedTags);

      if (!etrx) await trx.commit();
      return syncedTags;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  }

};

module.exports = service;