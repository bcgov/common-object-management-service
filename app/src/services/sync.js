const { v4: uuidv4, validate: uuidValidate } = require('uuid');

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
        // if object wasn't deleted in objectSync or in 'fullMode'
        if (syncObject || fullMode ) {
          await service.syncVersions({ path: path, bucketId: bucketId, syncObject: syncObject }, trx);
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
   * returns either
   * <ObjectModel> (when object exists in both COMS and S3 after sync)
   * or undefined (when object was pruned from COMS db after sync)
   */
  syncObject: async ({ path, bucketId }, etrx = undefined) => {

    let trx, response;
    try {
      // start transaction if trx object not passed (transaction already started higher up the stack)
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

      // ----- INSERT action
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

      // ----- DELETE action
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
   * @param {string} [options.path] The path of object in sync job
   * @param {string} [options.bucketId] The uuid bucketId of object in sync job
   * @param {object} [options.syncObject=undefined] the response from previous syncObject method
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   */
  syncVersions: async ({ path, bucketId, syncObject = undefined }, etrx = undefined) => {

    let objectId, trx;
    try {
      // start transaction if trx object not passed (transaction already started higher up the stack)
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // --- get COMS versions
      // use object id from syncObject response if provided
      if(syncObject) objectId = syncObject.id;
      // else get object Id using path and bucketId
      else {
        const object = await ObjectModel.query(trx).first().where({ path: path, bucketId: bucketId });
        objectId = object.id;
      }
      const comsVs = await Version.query(trx).modify('filterObjectId', objectId);

      // --- get S3 versions
      // get object. note: this will return (200) for any path
      const s3Obj = await storageService.listObjectVersion({ filePath: path, bucketId: bucketId });
      const s3Versions = s3Obj.Versions ? s3Obj.Versions : [];
      const s3DeleteMarkers = s3Obj.DeleteMarkers ? s3Obj.DeleteMarkers : [];
      const s3Vs = s3Versions.concat(s3DeleteMarkers);


      // for each version in s3
      // ---- for versioned bucket (ie: if VersionId is not not 'null' (string)
      // each s3 version and dm will have a VersionId
      // foreach s3Vs, if not in comsVs (match on VersionId AND objectId).. insert.
      // foreach comsVs if not in s3Vs, delete from db
      // first, remove any from db where not in s3 VersionId's


      // ---- for non-versioned bucket
      // if VersionId is 'null', it must be a non-versioned bucket
      // there will only be 1 s3 version and no delete markers.
      // if a coms version with matching etag,
      // - patch: isLatest=true,
      // else insert as new version and remove old version


      // insert and update versions
      s3Vs.forEach( async (s3V) => {
        // if a versioned bucket
        if(s3V.VersionId) {
          // if not in COMS db
          if (!comsVs.some((comsV) => (comsV.s3VersionId === s3V.VersionId))){
            // insert into db
            await Version.query(trx).insert({});
          }
          // else found in db, patch details(?)
          await Version.query(trx).update({ isLatest: s3V.isLatest}).where({ objectId: objectId, s3VersionId: s3V.VersionId });
        }
        // else S3 bucket is non-versioned
        else {
          // if a coms version has matching ETag,
          if (!comsVs.some((comsV) => (comsV.etag === s3V.ETag))){
            // patch isLatest
            await Version.query(trx).update({ isLatest: true}).where({ objectId: objectId });
          }
        }
      });
      // delete versions
      comsVs.forEach(async comsV => {
        // if not in S3 versions
        if (!s3Vs.some((s3V) => (s3V.s3VersionId === comsV.VersionId))){
          // delete db
          await versionService.delete(comsV.id, comsV.s3VersionId);
        }
      });

      if (!etrx) await trx.commit();
      return s3Obj;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  }

};

module.exports = service;
