const { v4: uuidv4, NIL: SYSTEM_USER, NIL: SYSTEM_VERSION } = require('uuid');

const { Version } = require('../db/models');

/**
 * The Version DB Service
 */
const service = {
  /**
   * @function create
   * Saves a version of an object
   * @param {object[]} data array of object attributes and `versionId` from S3 object
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  create: async (data = {}, currentUserId = SYSTEM_USER, etrx = undefined) => {

    if (!data.id) {
      throw new Error('Invalid objectId supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      const version = {
        id: uuidv4(),
        versionId: data.versionId ? data.versionId : SYSTEM_VERSION,
        objectId: data.id,
        createdBy: currentUserId,
        mimeType: data.mimeType,
        originalName: data.originalName
      };
      const response = await Version.query(trx).insert(version);
      //console.log('version create returns:', response);

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function createVersionOfObjects
   * Saves a version of each object in an array
   * @param {object[]} data array of objects each with an `objectId` and version data
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of calling the create() method for all objects
   * @throws The error encountered upon db transaction failure
   */
  createVersionOfObjects: async (data = [], userId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      // wait for all create version calls
      const response =  Promise.all(data.map(async (object) => {
        await service.create(object, userId);
      }));

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  }

};

module.exports = service;
