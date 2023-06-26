const { v4: uuidv4, validate: uuidValidate } = require('uuid');

const { ObjectModel } = require('../db/models');
const utils = require('../db/models/utils');

const objectService = require('./object');
const storageService = require('./storage');

/**
 * The Sync Service
 * bi-directional sync of object data between object storage and the COMS database
 */
const service = {

  /**
   * co-ordinates the syncing steps
   * @param {string} path
   * @param {string} bucketId
   */
  sync: async (path = undefined, bucketId = undefined) => {
    try {
      await utils.trxWrapper(async (trx) => {

        // sync object
        const object = await service.syncObject(path, bucketId, trx);
        // console.log('syncObject:', object);
      });
    }
    catch (e) {
      console.log(e);
    }
  },


  /**
   * @function syncObject
   * syncs object-level data
   * @param {string} path The path column from object_queue db table
   * @param {string} bucketId The uuid bucketId column from object_queue db table
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns one of the following:
   *  - { action: 'INSERT', object: <ObjectModel> }
   *  - { action: 'DELETE', object: <ObjectModel> }
   *  - { action: undefined, object:undefined }
   *
   * notes:
   * - listAllObjects() does not include deleted objects (soft-deletes)
   */
  syncObject: async (path, bucketId, etrx = undefined) => {

    let trx, action, response;
    try {
      // start transaction if trx object not passed (transaction already started higher up the stack)
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // await call to look for object in both the COMS db and S3
      const [comsObjectPromise, s3ObjectPromise] = await Promise.allSettled([
        // COMS object
        ObjectModel.query(trx).first().where({ path: path, bucketId: bucketId }),
        // S3 object
        storageService.headObject({ filePath: path, bucketId: bucketId })
      ]);
      const comsObject = comsObjectPromise.value ;
      const s3Object = s3ObjectPromise.value ;

      // ----- INSERT action
      // if not in COMS db and exists in S3
      if (!comsObject && s3Object) {
        action = 'INSERT';

        // get coms-id tag from S3 if exists
        const s3Obj = await storageService.getObjectTagging({ filePath: path, bucketId: bucketId });
        const s3ObjectComsId = s3Obj.TagSet.find(obj => (obj.Key === 'coms-id'))?.Value;
        let comsId, hadComsIdTag = false;
        if(s3ObjectComsId && uuidValidate(s3ObjectComsId)) {
          comsId = s3ObjectComsId;
          hadComsIdTag = true;
        } else{
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
        if(!hadComsIdTag) await storageService.putObjectTagging({ filePath: path, bucketId: bucketId, tags: [{ Key: 'coms-id', Value: comsId }] });
      }

      // object exists in COMS db but not on S3
      else if (comsObject && !s3Object) {

        // because listAllObjects() doesn't queue soft-dleted objects from S3
        // if object is soft-deleted in S3 (has a deletemarker that is latest version)
        // no action required for object-level sync
        const s3Versions = await storageService.listObjectVersion({ filePath: path, bucketId: bucketId })
        const s3LatestVersionIsDeleteMarker = s3Versions.DeleteMarkers?.length && s3Versions.DeleteMarkers?.some(dm => dm.IsLatest === true);

        // ----- DELETE action
        if(!s3LatestVersionIsDeleteMarker){
          action = 'DELETE';
          // delete from COMS db
          response = await objectService.delete(comsObject.id, trx);
        }
      }

      if (!etrx) await trx.commit();
      return Promise.resolve({ action: action, object: response });
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = service;
