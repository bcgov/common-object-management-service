const { v4: uuidv4 } = require('uuid');

const { ObjectModel} = require('../db/models');
const objectService = require('./object');
const storageService = require('./storage');

/**
 * The Sync Service
 * bi-directional sync of object data between object storage and the COMS database
 */
const service = {
  /**
   * @function syncObject
   *
   *
   * @param {string} path The path column from object_queue db table
   * @param {string} bucketId The uuid bucketId column from object_queue db table
   */
  syncObject: async (path, bucketId, etrx = undefined) => {
    let trx, response;
    try {
      // start transaction because we might do inserts
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // find object in COMS db
      const comsObject = await ObjectModel
        .query(trx)
        .first()
        .where({ path: path, bucketId: bucketId });
      console.log('comsObject', comsObject);

      // if object does not exist in COMS db
      // queue job was probably a sync from S3 > COMS
      // but could also be COMS db pruning job, where the object was deleted from COMS manually after job was queued
      if (!comsObject) {

        // if object still exists in S3
        const s3Object = await storageService.getObjectTagging({ filePath: path, bucketId: bucketId });
        console.log('s3Object', s3Object);
        if(s3Object) {

          // create object in COMS db
          // use coms-id (if exists in S3 tag) else use randon uuid
          const s3ObjectComsId = s3Object.TagSet.find(obj => (obj.Key === 'coms-id')).Value;
          const comsId = s3ObjectComsId ? s3ObjectComsId :  uuidv4();
          console.log('comsId', comsId);

          const object = await objectService.create({
            id: comsId,
            name: path.substring(path.lastIndexOf('/') + 1), // get `name` column
            path: path,
            bucketId: bucketId,
          }, trx);
          console.log('coms object created', object);

          // .. proceded to version level checks
          // return object path, bucketId and objectId(?)
          response = { path: path, bucketId: bucketId, objectId: object.id };
          console.log('response', response);
        }

        // --- else delete object from COMS (object does not exist in S3)
        else {
          const deleted = await ObjectModel.query(trx)
            .delete()
            .where({ path: path, bucketId : bucketId });
          console.log('deleted', deleted);

        }

      }

      // --- else object exists ion COMS db
      // sync is a COMS db prune job
      else {

        // if object no longer exists in S3 (job is stale), delete from COMS db
        const s3Object = await storageService.headObject({ filePath: path, bucketId: bucketId });
        if(!s3Object) {
          const deleted2 = await ObjectModel.query(trx)
            .delete()
            .where({ path: path, bucketId : bucketId });
          console.log('deleted2', deleted2);
        }
        // else .. proceded to version level checks
        else {
          // return object path, bucketId and objectId(?)
          response = { path: path, bucketId: bucketId, objectId: comsObject.id };
          console.log('response2', response);
        }
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = service;
