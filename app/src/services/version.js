const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { Version } = require('../db/models');

/**
 * The Version DB Service
 */
const service = {
  /**
   * @function create
   * Saves a version of an object
   * @param {object[]} data array of object attributes and `versionId` from S3 object
   * @param {string} uuid of the current user
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
        versionId: data.VersionId,
        objectId: data.id,
        createdBy: currentUserId,
        mimeType: data.mimeType,
        originalName: data.originalName,
        isLatest: data.isLatest,
        deleteMarker: data.DeleteMarker
      };
      // insert version record
      await Version.query(trx).insert(version);

      // make version latest
      const response = await service.makeLatest(data.id, data.VersionId, trx);

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function createManyObjects
   * Saves a version of each object in an array
   * @param {object[]} data array of objects each with an `objectId` and version data
   * @param {string} uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of calling the create() method for all objects
   * @throws The error encountered upon db transaction failure
   */
  createManyObjects: async (data = [], userId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      // wait for all create version calls
      const response = await Promise.all(data.map(async (object) => {
        await service.create(object, userId, trx);
      }));
      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function delete
   * Delete a version record of an object
   * @param {string} objId The object uuid
   * @param {string} versionId The version ID or null if deleting an object
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<integer>} The number of remaining versions in db after the delete
   * @throws The error encountered upon db transaction failure
   */
  delete: async (objId, versionId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      await Version.query(trx)
        .delete()
        .where('objectId', objId)
        .where('versionId', versionId)
        .throwIfNotFound();

      // if other versions exist, make next most recent version current
      const versionCount = await Version.query(trx)
        .count('id as CNT')
        .where({ objectId: objId });
      const count = parseInt(versionCount[0].CNT);

      if (count > 0) await service.makeLatest(objId, undefined, trx);

      if (!etrx) await trx.commit();
      return count;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function makeLatest
   * Updates most recent or provided version with isLatest = true and all other versions of object with isLatest = false
   * @param {string} objId The object uuid
   * @param {string} versionId The version ID
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the update operation
   * @throws The error encountered upon db transaction failure
   */
  makeLatest: async (objId, versionId = undefined, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      const response = versionId ?
        // update provided version
        await Version.query(trx)
          .patch({ isLatest: true })
          .where('objectId', objId)
          .where('versionId', versionId)
          .returning('versionId')
        :
        // update most recent version
        await Version.query(trx)
          .returning('objectId', 'versionId', 'isLatest')
          .where('objectId', objId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .patch({ isLatest: true })
          .returning('versionId');

      // if a version was found and made latest
      // response may be an empty array if last version was deleted
      if (response.length) {
        // make all other versions isLatest = false
        await Version.query(trx)
          .patch({ isLatest: false })
          .whereNot('versionId', response[0].versionId)
          .andWhere('objectId', objId);
      }

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function update
   * Updates a version of an object.
   * Typically happens when updating the 'null-version' created for an object
   * on a non-versioned or version-suspnded bucket.
   * @param {object[]} data array of object attributes
   * @param {string} currentUserId uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<integer>} The number of updated rows returned by db operation
   * @throws The error encountered upon db transaction failure
   */
  update: async (data = {}, currentUserId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      // update version record
      const response = await Version.query(trx)
        .where({ objectId: data.id })
        .update({
          objectId: data.id,
          updatedBy: currentUserId,
          mimeType: data.mimeType,
          originalName: data.originalName
        });

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = service;
