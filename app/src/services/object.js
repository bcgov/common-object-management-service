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
   * @param {string} data.oidcId The uploading user oidcId
   * @param {string} data.originalName The object's original name
   * @param {string} data.path The relative S3 key/path of the object
   * @param {string} [data.public] The optional public flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  create: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // Add file record to DB
      const obj = {
        id: data.id,
        originalName: data.originalName,
        path: data.path,
        mimeType: data.mimeType,
        public: data.public,
        createdBy: data.oidcId
      };
      await ObjectModel.query(trx).insert(obj);

      // Add all permission codes for the uploader
      if (data.oidcId) {
        const perms = Object.values(Permissions).map((p) => ({
          oidcId: data.oidcId,
          permCode: p
        }));
        await permissionService.addPermissions(data.id, perms, data.oidcId, trx);
      }

      if (!etrx) await trx.commit();
      return await service.read(data.id);
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

      await permissionService.removePermissions(objId, undefined, undefined, trx);
      await ObjectModel.query(trx)
        .deleteById(objId)
        .throwIfNotFound();

      if (!etrx) await trx.commit();
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /** Get an object db record */
  // TODO: Add modify logic to ObjectModel
  listObjects: () => {
    return ObjectModel.query();
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
   * @param {string} data.oidcId The uploading user oidcId
   * @param {string} data.originalName The object's original name
   * @param {string} data.path The relative S3 key/path of the object
   * @param {string} [data.public] The optional public flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the patch operation
   * @throws The error encountered upon db transaction failure
   */
  update: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // Add file record to DB
      const response = await ObjectModel.query(trx).patchAndFetchById(data.id, {
        originalName: data.originalName,
        path: data.path,
        mimeType: data.mimeType,
        public: data.public,
        updatedBy: data.oidcId
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