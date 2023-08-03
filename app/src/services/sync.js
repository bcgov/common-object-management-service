const { NIL: SYSTEM_USER, v4: uuidv4, validate: uuidValidate } = require('uuid');

const log = require('../components/log')(module.filename);
const utils = require('../db/models/utils');

const { ObjectModel, Version } = require('../db/models');
const { getKeyValue, toLowerKeys } = require('../components/utils');

const metadataService = require('./metadata');
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
   * Wraps all child processes in one db transaction
   * @param {string} options.path String representing the canonical path for the specified object
   * @param {string} [options.bucketId=undefined] Optional uuid of bucket
   * @param {boolean} [options.full=false] Optional boolean indicating whether to execute full recursive run
   * @param {string} [options.userId=SYSTEM_USER] Optional uuid attributing which user added the job
   * @returns
   * @throws If the synchronization job encountered an error
   */
  syncJob: async ({ path, bucketId = undefined, full = false, userId = SYSTEM_USER } = {}) => {
    try {
      if (!path) throw new Error('Path must be defined');
      const response = [];
      // start db transaction
      await utils.trxWrapper(async (trx) => {

        // 1. sync object
        const object = await service.syncObject({ path: path, bucketId: bucketId, userId: userId }, trx);
        response.push(object);

        // 2. sync all versions of object
        let versions = [];
        // IF this is a new (or existing) object in COMS DB (from step 1)
        // OR doing 'full' sync AND object wasn't deleted
        if (object?.newObject || (object && full)) {
          versions = await service.syncVersions({ objectId: object.id, userId: userId }, trx);
          response[0].versions = versions;
        }

        // 3. sync tags and metadata for each version
        for (const version of versions) {
          const tagset = [];
          const metadata = [];
          // IF this is a new (or existing) version
          // OR in full mode
          // AND version is not a delete-marker
          if ((version.newVersion || full) && !version.deleteMarker) {

            // sync tags
            const tags = await service.syncTags({
              version: version,
              path: path,
              bucketId: bucketId,
              objectId: object.id,
              userId: userId
            }, trx);
            tagset.push(tags);

            // sync metadata
            const meta = await service.syncMetadata({
              version: version,
              path: path,
              bucketId: bucketId,
              userId: userId
            }, trx);
            metadata.push(meta);

            // add synced tags/meta to response array
            response[0].versions.find(v => v.id === version.id).tagset = tagset;
            response[0].versions.find(v => v.id === version.id).metadata = metadata;
          }
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
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();
      let response; // synced object

      // await call to look for object in both the COMS db and S3
      const [comsObjectPromise, s3ObjectPromise] = await Promise.allSettled([
        // COMS object
        ObjectModel.query(trx).first().where({ path: path, bucketId: bucketId }),
        // S3 object
        storageService.headObject({ filePath: path, bucketId: bucketId })
          .catch((e) => {
            // return true if object is soft-deleted in S3
            if(e.$response.headers['x-amz-delete-marker']){
              return true; // it's a 'delete-marker'
            }
          })
      ]);
      const comsObject = comsObjectPromise.value;
      const s3Object = s3ObjectPromise.value;

      // // if already in sync, add to final response
      if (comsObject && s3Object) response = comsObject;

      // 1. insert object
      // if not in COMS db and exists in S3
      if (!comsObject && s3Object) {
        let objId = uuidv4();

        // IF not a delete-marker,
        if(typeof comsObject === 'object'){
          // use 'coms-id' tag on object in S3 (if managed by another COMS instance), otherwise add it
          const s3Obj = await storageService.getObjectTagging({ filePath: path, bucketId: bucketId });
          console.log('s3Obj', s3Obj);
          const s3ObjectComsId = s3Obj.TagSet.find(obj => (obj.Key === 'coms-id'))?.Value;
          if (s3ObjectComsId && uuidValidate(s3ObjectComsId)) {
            objId = s3ObjectComsId;
          } else {
            await storageService.putObjectTagging({ filePath: path, bucketId: bucketId, tags: [{ Key: 'coms-id', Value: objId }] });
          }
        }

        // create object in COMS db
        response = await objectService.create({
          id: objId,
          name: path.match(/(?!.*\/)(.*)$/)[0], // get `name` column
          path: path,
          bucketId: bucketId,
          userId: userId
        }, trx);
        // add `newObject` attribute, required for syncVersions() logic
        response.newObject = true;
      }

      // 2. or delete object
      // object exists in COMS db but not on S3
      if (comsObject && !s3Object) {
        // delete object and all child records from COMS db
        await objectService.delete(comsObject.id, trx);
        // TODO: consider pruning metadata and tag records, currently a slow process
      }

      if (!etrx) await trx.commit();
      // return Promise.resolve(response);
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function syncVersions
   * syncs version-level data
   * @param {string} [options.objectId] the parent object uuid
   * @param {string} [options.userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {object[]} array of synced versions that exist in COMS and S3 eg:
   * [ <Version>, <Version> ]
   */
  syncVersions: async ({ objectId, userId = SYSTEM_USER }, etrx = undefined) => {
    let trx;
    try {
      let response = []; // synced versions
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // COMS object record
      const object = await ObjectModel.query(trx).first().where({ id: objectId });

      // await call to get versions from both the COMS db and S3
      const [comsVersionPromise, s3VersionPromise] = await Promise.allSettled([
        Version.query(trx).modify('filterObjectId', object.id).orderBy('createdAt', 'desc'),
        storageService.listObjectVersion({ filePath: object.path, bucketId: object.bucketId })
      ]);

      // COMS versions
      const comsVs = comsVersionPromise.value;

      // S3 versions
      const s3Obj = s3VersionPromise.value;
      const s3Versions = s3Obj.Versions ? s3Obj.Versions : [];
      // add DeleteMarker property to reference when comparing with COMS
      const s3DeleteMarkers = s3Obj.DeleteMarkers ? s3Obj.DeleteMarkers.map(dm => ({ DeleteMarker: true, ...dm })) : [];
      // merge S3 Versions and DeleteMarkers into one array
      const s3Vs = s3Versions.concat(s3DeleteMarkers);

      // ---- compare COMS versions (comsVs) and S3 versions (s3Vs)
      // 1. delete versions from COMS that are not in S3
      for (const comsV of comsVs) {
        if (comsV.s3VersionId && !s3Vs.some((s3V) => (s3V.VersionId === comsV.s3VersionId))) {
          await versionService.delete(object.id, (comsV.s3VersionId ?? null), trx);
        }
      }

      // 2. insert and update versions in COMS db
      for (const s3V of s3Vs) {

        // if a versioned object (ie: if VersionId is not not 'null')
        if (s3V.VersionId !== 'null') {
          // if version in COMS db
          const comsV = comsVs.find((comsV) => (comsV.s3VersionId === s3V.VersionId));
          if (comsV) {
            // console.log('comsV.id:', comsV.id);
            // if isLatest in s3V, patch with isLatest in COMS
            if (s3V.IsLatest) {
              const updated = await versionService.updateIsLatest({ id: comsV.id, objectId: object.id, isLatest: s3V.IsLatest }, trx);
              response.push(updated[0]);
            } else { // version record not modified
              response.push(comsV);
            }
          }
          // else not found in db
          else {
            // get mimeType for new version
            const mimeType = s3V.DeleteMarker ? undefined : await storageService.headObject({ filePath: object.path, s3VersionId: s3V.VersionId, bucketId: object.bucketId }).then((obj => {
              return obj.ContentType ?? null;
            }));

            // insert into db
            const newVersion = await versionService.create({
              s3VersionId: s3V.VersionId,
              mimeType: mimeType,
              id: object.id,
              deleteMarker: s3V.DeleteMarker,
              etag: s3V.ETag,
              isLatest: s3V.IsLatest
            }, userId, trx);
            // console.log('newVersion:', newVersion);
            // add to response with `newVersion` attribute, required for sync tags/meta logic
            response.push({ ...newVersion, newVersion: true });
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
              s3VersionId: null,
              mimeType: mimeType,
              id: object.id,
              etag: s3V.ETag,
              isLatest: true
            }, userId, trx);
            // console.log('newVersion:', newVersion);
            response.push({ ...newVersion, newVersion: true });
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
            response.push({ ...updatedVersion, newVersion: true });
          }
          // version record not modified
          else {
            response.push(existingVersion);
          }
        }
      }

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }

  },

  /**
   * @function syncTags
   * syncs tag for an object version between S3 and COMS db
   * @param {string} [options.version] the COMS version uuid
   * @param {string} [options.path] String representing the canonical path for the specified object
   * @param {string} [options.bucketId=undefined] Optional COMS uuid of bucket
   * @param {string} [options.objectId] the parent object uuid
   * @param {string} [options.userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {object[]} array of synced tags that exist in COMS and S3 eg:
   * [ <Tag>, <Tag> ]
   */
  syncTags: async ({ version, path, bucketId=undefined, objectId, userId }, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();
      let response = [];

      // await calls to look for Tags in both the COMS db and S3
      const [comsTagPromise, s3TagPromise] = await Promise.allSettled([
        tagService.fetchTagsForVersion({ versionIds: version.id }),
        storageService.getObjectTagging({ filePath: path, s3VersionId: version.s3VersionId, bucketId: bucketId })
      ]);

      // COMS Tags
      const comsTagsForVersion = comsTagPromise.value;
      const comsTags = comsTagsForVersion[0]?.tagset ?? [];
      // S3 Tags
      const S3TagsForVersion = s3TagPromise.value;
      let S3Tags = [];

      if (S3TagsForVersion?.TagSet?.length > 0) {
        S3Tags = toLowerKeys(S3TagsForVersion?.TagSet);
        // ensure `coms-id` tag exists on this version in S3
        if (!S3Tags.find((s3T) => (s3T.key === 'coms-id'))) {
          await storageService.putObjectTagging({ filePath: path, bucketId: bucketId, tags: [{ Key: 'coms-id', Value: objectId }] });
          // add to our arrays for comaprison
          S3Tags.push({ key: 'coms-id', value: objectId });
        }
      }

      // ---- do differential logic between COMS tags (comsTags) and S3 tags (S3Tags)
      // 1. dissociate tags not in S3
      let oldTags = [];
      for (const comsT of comsTags) {
        if (!S3Tags.some((s3T) => (s3T.key === comsT.key && s3T.value === comsT.value))) {
          oldTags.push(comsT);
        }
      }
      if (oldTags.length > 0) await tagService.dissociateTags(version.id, oldTags, trx);

      // 2. associate new tags
      let newTags = [];
      for (const s3T of S3Tags) {
        if (!comsTags.some((comsT) => (comsT.key === s3T.key && comsT.value === s3T.value))) {
          newTags.push(s3T);
        } else {
          response.push(s3T);
        }
      }
      if (newTags.length > 0) {
        await tagService.associateTags(version.id, newTags, userId, trx);
        response.concat(newTags);
      }

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function syncMetadata
   * syncs tag for an object version between S3 and COMS db
   * @param {string} [options.version] the COMS version uuid
   * @param {string} [options.path] String representing the canonical path for the specified object
   * @param {string} [options.bucketId=undefined] Optional COMS uuid of bucket
   * @param {string} [options.userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {object[]} array of synced metadata that exist in COMS and S3 eg:
   * [ <Metadata>, <Metadata> ]
   */
  syncMetadata: async ({ version, path, bucketId, userId }, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();
      let response = [];

      // await calls to look for metadata in both the COMS db and S3
      const [comsMetadataPromise, s3ObjectHeadPromise] = await Promise.allSettled([
        metadataService.fetchMetadataForVersion({ versionIds: version.id }),
        storageService.headObject({ filePath: path, s3VersionId: version.s3VersionId, bucketId: bucketId })
      ]);

      // COMS metadata
      const comsMetadataForVersion = comsMetadataPromise.value;
      const comsMetadata = comsMetadataForVersion[0]?.metadata ?? [];

      // S3 metadata
      const s3ObjectHead = s3ObjectHeadPromise.value;
      const S3Metadata = s3ObjectHead.Metadata?.length > 0 ? getKeyValue(s3ObjectHead.Metadata) : [];

      // ---- do differential logic between COMS metadata (comsMetadata) and S3 metadata (S3Metadata)
      // 1. dissociate metadata not in S3
      let oldMetadata = [];
      for (const comsM of comsMetadata) {
        if (!S3Metadata.some((s3M) => (s3M.key === comsM.key && s3M.value === comsM.value))) {
          oldMetadata.push(comsM);
        }
      }
      if (oldMetadata.length > 0) {
        await metadataService.dissociateMetadata(version.id, oldMetadata, trx);
      }

      // 2. associate new metadata
      let newMetadata = [];
      for (const s3M of S3Metadata) {
        if (!comsMetadata.some((comsM) => (comsM.key === s3M.key && comsM.value === s3M.value))) {
          newMetadata.push(s3M);
        } else {
          response.push(s3M);
        }
      }
      if (newMetadata.length > 0) {
        await metadataService.associateMetadata(version.id, newMetadata, userId, trx);
        response.concat(newMetadata);
      }

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  }

};

module.exports = service;
