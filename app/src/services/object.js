const objectPermissionService = require('./objectPermission');
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
   * @param {string} data.userId The uploading user userId
   * @param {string} data.path The relative S3 key/path of the object
   * @param {boolean} [data.public] The optional public flag - defaults to true if undefined
   * @param {boolean} [data.active] The optional active flag - defaults to true if undefined
   * @param {string} [data.bucketId] The optional associated bucketId
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
        active: data.active,
        bucketId: data.bucketId,
        createdBy: data.userId
      };
      const response = await ObjectModel.query(trx).insert(obj).returning('*');

      // Add all permission codes for the uploader
      if (data.userId) {
        const perms = Object.values(Permissions).map((p) => ({
          userId: data.userId,
          permCode: p
        }));
        await objectPermissionService.addPermissions(data.id, perms, data.userId, trx);
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
   * @function getBucketKey
   * Gets the associated key path for a specific object record
   * @param {string} objId The object uuid to read
   * @returns {object.key} A single object an attribute key
   * @throws If there are no records found
   */
  getBucketKey: (objId) => {
    return ObjectModel.query()
      .findById(objId)
      .select('bucket.key')
      .joinRelated('bucket')
      .first()
      .throwIfNotFound();
  },

  /**
   * @function searchObjects
   * Search and filter for specific object records
   * @param {string|string[]} [params.id] Optional string or array of uuids representing the object
   * @param {string|string[]} [params.bucketId] Optional string or array of uuids representing bucket ids
   * @param {string} [params.path] Optional canonical S3 path string to match on
   * @param {boolean} [params.public] Optional boolean on object public status
   * @param {boolean} [params.active] Optional boolean on object active
   * @param {boolean} [params.deleteMarker] Optional boolean on object version deleteMarker
   * @param {boolean} [params.latest] Optional boolean on object version is latest
   * @param {string} [params.mimeType] Optional mimeType string to match on
   * @param {string} [params.name] Optional metadata name string to match on
   * @param {object} [params.metadata] Optional object of metadata key/value pairs
   * @param {object} [params.tag] Optional object of tag key/value pairs
   * @returns {Promise<object[]>} The result of running the find operation
   */
  searchObjects: (params) => {
    return ObjectModel.query()
      .allowGraph('[objectPermission, version]')
      // .withGraphJoined('version')
      .modify('filterIds', params.id)
      .modify('filterBucketIds', params.bucketId)
      .modify('filterPath', params.path)
      .modify('filterPublic', params.public)
      .modify('filterActive', params.active)
      .modify('filterMimeType', params.mimeType)
      .modify('filterDeleteMarker', params.deleteMarker)
      .modify('filterLatest', params.latest)
      .modify('filterMetadataTag', {
        name: params.name,
        metadata: params.metadata,
        tag: params.tag
      });
      // .then(result => result.map(row => {
      //   // eslint-disable-next-line no-unused-vars
      //   const { objectPermission, version, ...object } = row;
      //   return object;
      // }));
  },

  /**
   * @function read
   * Get an object db record
   * @param {string} objId The object uuid to read
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
   * @param {string} data.userId The uploading user userId
   * @param {string} data.path The relative S3 key/path of the object
   * @param {boolean} [data.public] The optional public flag - defaults to true if undefined
   * @param {boolean} [data.active] The optional active flag - defaults to true if undefined
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
        active: data.active,
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
