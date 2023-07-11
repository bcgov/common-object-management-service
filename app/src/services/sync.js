const { NIL: SYSTEM_USER, v4: uuidv4, validate: uuidValidate } = require('uuid');

const log = require('../components/log')(module.filename);
const { ObjectModel, Version } = require('../db/models');
const utils = require('../db/models/utils');

const objectService = require('./object');
const storageService = require('./storage');
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

      await utils.trxWrapper(async (trx) => {
        // 1. sync object
        const object = await service.syncObject({ path: path, bucketId: bucketId, userId: userId }, trx);

        // 2. sync versions
        let versions = [];
        // if object wasn't deleted in objectSync or in 'fullMode'
        if (object || full) {
          versions = await service.syncVersions({ path: path, bucketId: bucketId, object: object, userId: userId }, trx);
        }

        // 3. sync metadata & tags
        if (versions.length || full) {
          // sync metadata
        }
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

        // Add new coms-id tag to object in S3 if it ddn't have one before sync
        if (!hadComsIdTag) await storageService.putObjectTagging({ filePath: path, bucketId: bucketId, tags: [{ Key: 'coms-id', Value: comsId }] });
      }

      // 2. or delete object
      // object exists in COMS db but not on S3
      if (comsObject && !s3Object) {
        // delete from COMS db
        response = await objectService.delete(comsObject.id, trx);
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
   * @param {string} [options.path] The path of parent object in sync job
   * @param {string} [options.bucketId] The uuid bucketId of parent object in sync job
   * @param {object} [options.object=undefined] the response from a previous syncObject method
   * @param {string} [options.userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {object[]} array of synced versions that exist in COMS and S3 eg:
   * [ <Version>, <Version> ]
   */
  syncVersions: async ({ path, bucketId, object = undefined, userId = SYSTEM_USER }, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // --- get COMS versions
      // use object id from syncObject response if provided (eg: in fullMode) else use path and bucketId
      let objectId;
      if (object) objectId = object.id;
      else {
        const object = await ObjectModel.query(trx).first().where({ path: path, bucketId: bucketId });
        objectId = object.id;
      }
      const comsVs = await Version.query(trx).modify('filterObjectId', objectId).orderBy('createdAt');

      // --- get S3 versions (merge Versions and DeleteMarkers into one array)
      const s3Obj = await storageService.listObjectVersion({ filePath: path, bucketId: bucketId });
      const s3Versions = s3Obj.Versions ? s3Obj.Versions : [];
      // add DeleteMarker property to identify
      const s3DeleteMarkers = s3Obj.DeleteMarkers ? s3Obj.DeleteMarkers.map(dm => ({ DeleteMarker: true, ...dm })) : [];
      const s3Vs = s3Versions.concat(s3DeleteMarkers);

      // ---- do differential logic between COMS versions (comsVs) and S3 versions (s3Vs)
      // 1. delete versions not in S3
      for (const comsV of comsVs) {
        if (comsV.s3VersionId && !s3Vs.some((s3V) => (s3V.VersionId === comsV.s3VersionId))) {
          await versionService.delete(objectId, (comsV.s3VersionId ?? null), trx);
          // TODO (optional): remove this item from comsVs array
        }
      }

      // 2. insert and update versions
      let syncedVersions = [];
      for (const s3V of s3Vs) {
        // if a versioned object (ie: if VersionId is not not 'null')
        if (s3V.VersionId !== 'null') {
          // if version in COMS db
          const comsV = comsVs.find((comsV) => (comsV.s3VersionId === s3V.VersionId));
          if (comsV) {
            // if isLatest in s3V, patch with isLatest (this will only run for one S3 version)
            if (s3V.IsLatest) {
              const updated = await versionService.updateIsLatest({ id: comsV.id, objectId: objectId, isLatest: s3V.IsLatest }, null, trx);
              syncedVersions.concat(updated);
            }
            // push matching comsV to final array
            else {
              syncedVersions.push(comsV);
            }
          }
          // else not found in db
          else {
            // get mimeType for new version
            const mimeType = await storageService.headObject({ filePath: path, s3VersionId: s3V.VersionId, bucketId: bucketId }).then((obj => {
              return obj.ContentType;
            }));

            // insert into db
            const newVersion = await versionService.create({
              s3VersionId: s3V.VersionId,
              mimeType: mimeType,
              id: objectId,
              deleteMarker: s3V.DeleteMarker,
              etag: s3V.ETag
            }, userId, trx);

            syncedVersions.push(newVersion);
          }
        }
        // else S3 object is non-versioned (there will only be one S3 version)
        else {
          // get mimeType of S3 version
          const mimeType = await storageService.headObject({ filePath: path, bucketId: bucketId }).then((obj => {
            return obj.ContentType;
          }));
          // get existing versions
          const existing = await Version.query(trx)
            .where({ 'objectId': objectId })
            .orderBy([
              { column: 'isLatest', nulls: 'last' },
              { column: 'createdAt', order: 'desc', nulls: 'last' }
            ]);
          // if latest version has different etag or mimetype
          const latest = existing[0];

          if (latest.mimeType !== mimeType || latest.etag !== s3V.Etag) {
            // update latest version
            const updated = await Version.query(trx)
              .update({
                'mimeType': mimeType,
                'objectId': objectId,
                'etag': s3V.ETag,
                'isLatest': true,
                's3VersionId': null,
                'updatedBy': userId
              })
              .where('id', latest.id)
              .returning('*');
            syncedVersions.push(updated[0]);
          } else {
            syncedVersions.push(latest);
          }
          // if has other old versions, delete them
          if (existing.length > 1) {
            await Version.query(trx)
              .delete()
              .where({ 'objectId': objectId })
              .whereNot({ 'id': latest.id });
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

};

module.exports = service;
