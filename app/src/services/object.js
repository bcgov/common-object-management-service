const permissionService = require('./permission');
const { Permissions } = require('../components/constants');
const { ObjectModel } = require('../db/models');

/**
 * The Object DB Service
 */
const service = {
  /**
   * @function create
   * Create an object DB record and give the uploader (if authed) permissions
   * @param {string} data.id The object uuid
   * @param {string} data.mimeType The object's mime type
   * @param {string} data.userId The uploading user userId
   * @param {string} data.originalName The object's original name
   * @param {string} data.path The relative S3 key/path of the object
   * @param {boolean} [data.public] The optional public flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  create: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // Add object record to DB
      const obj = {
        id: data.id,
        path: data.path,
        public: data.public,
        createdBy: data.userId
      };
      const response = await ObjectModel.query(trx).insert(obj).returning('*');

      // Add all permission codes for the uploader
      if (data.userId) {
        const perms = Object.values(Permissions).map((p) => ({
          userId: data.userId,
          permCode: p
        }));
        await permissionService.addPermissions(data.id, perms, data.userId, trx);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function delete
   * Delete an object record
   * @param {string} objId The object uuid to delete
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  delete: async (objId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      const response = await ObjectModel.query(trx)
        .deleteById(objId)
        .throwIfNotFound()
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function searchObjects
   * Search and filter for specific object records
   * @param {string|string[]} [params.id] Optional string or array of uuids representing the object
   * @param {string} [params.originalName] Optional filename string to match on
   * @param {string} [params.path] Optional canonical S3 path string to match on
   * @param {string} [params.mimeType] Optional mimeType string to match on
   * @param {string} [params.metadata] Optional metadata string to match on
   * @param {boolean} [params.public] Optional boolean on object public status
   * @param {boolean} [params.active] Optional boolean on object active status
   * @param {boolean} [params.deleteMarker] Optional boolean, is object soft-deleted
   * @returns {Promise<object>} The result of running the find operation
   */
  searchObjects: (params) => {
    return ObjectModel.query()
      .modify('filterIds', params.id)
      .modify('filterPath', params.path)
      .modify('filterPublic', params.public)
      .modify('filterActive', params.active)
      .modify('filterUserId', params.userId)
      .modify('filterOriginalName', params.originalName)
      .modify('filterMimeType', params.mimeType);
    // .modify('filterMetadata', params.metadata);
  },

  /**
   * @function read
   * Get an object db record
   * @param {string} objId The object uuid to delete
   * @returns {Promise<object>} The result of running the read operation
   * @throws If there are no records found
   */
  read: (objId) => {
    return ObjectModel.query()
      .findById(objId)
      .throwIfNotFound();
  },

  /**
   * @function update
   * Update an object DB record
   * @param {string} data.id The object uuid
   * @param {string} data.mimeType The object's mime type
   * @param {string} data.userId The uploading user userId
   * @param {string} data.originalName The object's original name
   * @param {string} data.path The relative S3 key/path of the object
   * @param {boolean} [data.public] The optional public flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the patch operation
   * @throws The error encountered upon db transaction failure
   */
  update: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // Update object record in DB
      const response = await ObjectModel.query(trx).patchAndFetchById(data.id, {
        path: data.path,
        public: data.public,
        updatedBy: data.userId
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
