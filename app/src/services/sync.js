const { NIL: SYSTEM_USER, v4: uuidv4, validate: uuidValidate } = require('uuid');

const { ObjectModel, Version } = require('../db/models');
const utils = require('../db/models/utils');

const objectService = require('./object');
const storageService = require('./storage');
const versionService = require('./version');

/**
 * The Sync Service
 * bi-directional sync of object data between object storage and the COMS database
 */
const service = {

  /**
   * co-ordinates the syncing steps
   * @param {string} [options.path=undefined]
   * @param {string} [options.bucketId=undefined]
   * @param {boolean} [options.fullMode=true]
   */
  sync: async ({ path = undefined, bucketId = undefined, fullMode = true }) => {
    try {
      await utils.trxWrapper(async (trx) => {

        // 1. sync object
        const syncObject = await service.syncObject({ path: path, bucketId: bucketId }, trx);

        // 2. sync versions
        let syncVersionsResult = [];
        // if object wasn't deleted in objectSync or in 'fullMode'
        if (syncObject || fullMode ) {
          syncVersionsResult = await service.syncVersions({ path: path, bucketId: bucketId, syncObject: syncObject }, trx);
        }

        // 3. sync metadata & tags
        if (syncVersionsResult.length || fullMode ) {
          // sync metadata
        }

      });
    }
    catch (e) {
      console.log(e);
    }
  },


  /**
   * @function syncObject
   * syncs object-level data
   * @param {string} [options.path] The path of object in sync job
   * @param {string} [options.bucketId] The uuid bucketId of object in sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {object} synced objects that exist in COMS and S3 eg:
   * <ObjectModel> (synced object)
   * or `undefined` (when object was pruned from COMS db after sync)
   */
  syncObject: async ({ path, bucketId }, etrx = undefined) => {
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
   * @param {object} [options.syncObject=undefined] the response from a previous syncObject method
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {object[]} array of synced versions that exist in COMS and S3 eg:
   * [ <Version>, <Version> ]
   */
  syncVersions: async ({ path, bucketId, syncObject = undefined }, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();
      // --- get COMS versions
      // use object id from syncObject response if provided (eg: in fullMode) else use path and bucketId
      let objectId;
      if(syncObject) objectId = syncObject.id;
      else {
        const object = await ObjectModel.query(trx).first().where({ path: path, bucketId: bucketId });
        objectId = object.id;
      }
      const comsVs = await Version.query(trx).modify('filterObjectId', objectId).orderBy('createdAt');

      // --- get S3 versions (merge Versions and DeleteMarkers into one array)
      const s3Obj = await storageService.listObjectVersion({ filePath: path, bucketId: bucketId });
      const s3Versions = s3Obj.Versions ? s3Obj.Versions : [];
      // add DeleteMarker property to identify
      const s3DeleteMarkers = s3Obj.DeleteMarkers ? s3Obj.DeleteMarkers.map(dm => ({ DeleteMarker: true, ...dm})) : [];
      const s3Vs = s3Versions.concat(s3DeleteMarkers);

      // ---- do differential logic between COMS versions (comsVs) and S3 versions (s3Vs)
      // 1. delete versions not in S3
      for (const comsV of comsVs) {
        // if COMS version (except nulls) not in S3 versions
        if (comsV.s3VersionId && !s3Vs.some((s3V) => (s3V.VersionId === comsV.s3VersionId))){
          // delete from db
          await versionService.delete(objectId, (comsV.s3VersionId ?? null), trx);
        }
        // optional TODO: remove this item from comsVs array
      }

      // 2. insert and update versions
      let syncedVersions = [];
      for (const s3V of s3Vs) {
        let mimeType;
        // if a versioned object (ie: if VersionId is not not 'null')
        if(s3V.VersionId !== 'null') {
          // if version in COMS db
          if (comsVs.some((comsV) => (comsV.s3VersionId === s3V.VersionId))){
            // patch with isLatest
            const updatedVersion = await Version.query(trx)
              .update({ 'objectId': objectId, isLatest: s3V.IsLatest})
              .where({ 'objectId': objectId, 's3VersionId': s3V.VersionId })
              .returning('*');
            // get mimetype of that COMS version for any new version inserts (best effort)
            // TODO: with current async/await behaviour, this doesnt seem to be available in the next iteration
            mimeType = updatedVersion.mimeType;

            syncedVersions.push(updatedVersion);
          }
          // else not found in db
          else {
            // insert into db
            const newVersion = await versionService.create({
              s3VersionId: s3V.VersionId,
              mimeType: mimeType,
              id: objectId,
              deleteMarker: s3V.DeleteMarker,
              etag: s3V.ETag,
              isLatest: s3V.IsLatest
            }, SYSTEM_USER, trx);

            syncedVersions.push(newVersion);
          }
        }
        // else S3 object is non-versioned (there will only be one S3 version)
        else {
          // delete existing versions in coms db
          await Version.query(trx).delete().where({ 'objectId': objectId });

          // insert S3 version
          const replacedVersion = await versionService.create({
            s3VersionId: null,
            // mimeType: mimeType,
            // get mimetype of previous single version
            mimeType: comsVs[0]?.mimeType,
            id: objectId,
            deleteMarker: s3V.DeleteMarker,
            etag: s3V.ETag,
            isLatest: s3V.IsLatest
          }, SYSTEM_USER, trx);

          syncedVersions.push(replacedVersion);
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
