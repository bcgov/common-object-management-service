const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const metadataService = require('./metadata');
const { Version } = require('../db/models');

/**
 * The Version DB Service
 */
const service = {
  /**
   * @function create
   * Saves a version and related metadata of each object in an array
   * @param {object[]} data array of objects each with an `objectId` and version data
   * @param {string} userId uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of calling the create() method for all objects
   * @throws The error encountered upon db transaction failure
   */
  create: async (data = [], userId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      // for each object version we are creating
      const response = await Promise.all(data.map(async v => {
        // insert version record
        const insertVersion = await Version.query(trx)
          .insert({
            id: uuidv4(),
            versionId: v.VersionId,
            mimeType: v.mimeType,
            objectId: v.id,
            createdBy: userId,
            deleteMarker: v.DeleteMarker,
          });
        //  Add metadata
        if(v.metadata) await metadataService.addMetadata(insertVersion.id, v.metadata, data.userId, trx);
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
      const response = await Version.query(trx)
        .delete()
        .where('objectId', objId)
        .where('versionId', versionId)
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*')
        .throwIfNotFound();
      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function list
   * list versions of an object.
   * @param {string} uuid of an object
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<array>} Array of rows returned from the database
   * @throws The error encountered upon db transaction failure
   */
  list: async (objId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      // update version record
      const response = await Version.query(trx)
        .where({ objectId: objId });
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
   * Replaces metadta that already exists on this version by default
   * @param {object[]} data array of object attributes
   * @param {string} userId uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<integer>} The number of updated rows returned by db operation
   * @throws The error encountered upon db transaction failure
   */
  update: async (data = {}, userId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      // update version record
      const version = await Version.query(trx)
        .where({ objectId: data.id })
        .update({
          objectId: data.id,
          updatedBy: userId,
          mimeType: data.mimeType
        })
        .first()
        .returning('id');

      if(data.metadata) await metadataService.addMetadata(version.id, data.metadata, data.userId, trx);

      if (!etrx) await trx.commit();
      return version;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = service;
