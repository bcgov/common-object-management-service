const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const { Version } = require('../db/models');

/**
 * The Version DB Service
 */
const service = {
  /**
   * @function copy
   * Creates a new Version DB record from an existing record
   * @param {string} sourceVersionId S3 VersionId of source version
   * @param {string} newVersionId S3 VersionId of new version
   * @param {string} objectId uuid of the object
   * @param {string} UserId uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The Version created in database
   * @throws The error encountered upon db transaction failure
   */
  copy: async (sourceVersionId, newVersionId, objectId, userId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      // if sourceVersionId is undefined, copy latest version
      const sourceVersion = sourceVersionId ?
        await Version.query(trx)
          .where({
            versionId: sourceVersionId,
            objectId: objectId
          })
          .first() :
        await Version.query(trx)
          .where({
            objectId: objectId
          })
          .orderBy([
            { column: 'createdAt', order: 'desc' },
            { column: 'updatedAt', order: 'desc', nulls: 'last' }
          ])
          .first();

      const response = await Version.query(trx)
        .insert({
          id: uuidv4(),
          versionId: newVersionId,
          objectId: objectId,
          mimeType: sourceVersion.mimeType,
          deleteMarker: sourceVersion.deleteMarker,
          createdBy: userId
        });

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function create
   * Saves a version of an object
   * @param {object[]} data an object with an `objectId` and version data
   * @param {string} userId uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} the Version object inserted into the database
   * @throws The error encountered upon db transaction failure
   */
  create: async (data = {}, userId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      const response = await Version.query(trx)
        .insert({
          id: uuidv4(),
          versionId: data.versionId,
          mimeType: data.mimeType,
          objectId: data.id,
          createdBy: userId,
          deleteMarker: data.deleteMarker
        })
        .returning('id', 'objectId');

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
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
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
 * @function get
 * Get a given version from the database
 * @param {object[]} versionId S3 VersionId if null or undefined,
 * get latest version (excluding delete-makers)
 * @param {string} objectId id of the parent object
 * @param {object} [etrx=undefined] An optional Objection Transaction object
 * @returns {Promise<object>} the Version object from the database
 * @throws The error encountered upon db transaction failure
 */
  get: async (versionId, objectId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      let response = undefined;
      if (versionId) {
        response = await Version.query(trx)
          .where({
            versionId: versionId,
            objectId: objectId
          })
          .first();
      }
      else {
        response = await Version.query(trx)
          .where('objectId', objectId)
          .andWhere('deleteMarker', false)
          .orderBy('createdAt', 'desc')
          .first();
      }
      if (!etrx) await trx.commit();
      return Promise.resolve(response);
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
      return Promise.resolve(response);
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
   * @param {string} userId uuid of the current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<integer>} id of Version object updated in the database
   * @throws The error encountered upon db transaction failure
   */
  update: async (data = {}, userId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      // update version record
      const versionId = data.versionId ? data.versionId : null;
      const version = await Version.query(trx)
        .where({ objectId: data.id, versionId: versionId })
        .patch({
          objectId: data.id,
          updatedBy: userId,
          mimeType: data.mimeType
        })
        .first()
        .returning('id');

      // TODO: consider updating metadata here instead of the controller

      if (!etrx) await trx.commit();
      return Promise.resolve(version);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = service;
