const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { Permissions } = require('../components/constants');
const { BucketPermission, ObjectPermission } = require('../db/models');

/**
 * The Bucket Permission DB Service
 */
const service = {
  /**
   * @function addPermissions
   * Grants bucket permissions to users
   * @param {string} bucketId The bucketId uuid
   * @param {object[]} data Incoming array of `userId` and `permCode` tuples to add for this `bucketId`
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addPermissions: async (bucketId, data, currentUserId = SYSTEM_USER, etrx = undefined) => {
    if (!bucketId) {
      throw new Error('Invalid bucketId supplied');
    }
    if (!data || !Array.isArray(data) || !data.length) {
      throw new Error('Invalid data supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await BucketPermission.startTransaction();

      // Get existing permissions for the current bucket
      const currentPerms = await service.searchPermissions({ bucketId });
      const obj = data
        // Ensure all codes are upper cased
        .map(p => ({ ...p, code: p.permCode.toUpperCase().trim() }))
        // Filter out any invalid code values
        .filter(p => Object.values(Permissions).some(perm => perm === p.permCode))
        // Filter entry tuples that already exist
        .filter(p => !currentPerms.some(cp => cp.userId === p.userId && cp.permCode === p.permCode))
        // Create DB buckets to insert
        .map(p => ({
          id: uuidv4(),
          userId: p.userId,
          bucketId: bucketId,
          permCode: p.permCode,
          createdBy: currentUserId
        }));

      // Insert missing entries
      let response = [];
      if (obj.length) {
        response = await BucketPermission.query(trx).insertAndFetch(obj);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function removePermissions
   * Deletes bucket permissions for a user
   * @param {string} bucketId The bucketId uuid
   * @param {string[]} [userIds=undefined] Optional incoming array of user userId uuids to change
   * @param {string[]} [permissions=undefined] An optional array of permission codes to remove; defaults to undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  removePermissions: async (bucketId, userIds = undefined, permissions = undefined, etrx = undefined) => {
    if (!bucketId) {
      throw new Error('Invalid bucketId supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await BucketPermission.startTransaction();

      let perms = undefined;
      if (permissions && Array.isArray(permissions) && permissions.length) {
        const cleanPerms = permissions
          // Ensure all codes are upper cased
          .map(p => p.toUpperCase().trim())
          // Filter out any invalid code values
          .filter(p => Object.values(Permissions).some(perm => perm === p));
        // Set as undefined if empty array
        perms = (cleanPerms.length) ? cleanPerms : undefined;
      }

      const response = await BucketPermission.query(trx)
        .delete()
        .modify('filterUserId', userIds)
        .modify('filterBucketId', bucketId)
        .modify('filterPermissionCode', perms)
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
   * @function listInheritedBucketIds
   * Get buckets that contain objects with any permissions for given user(s)
   * @param {string[]} [params.userId] Optional array of uuids representing the user
   * @returns {Promise<object>} The result of running the find operation
   */
  listInheritedBucketIds: async (userIds = []) => {
    return ObjectPermission.query()
      .select('bucketId')
      .distinct('userId')
      .joinRelated('object')
      .modify('filterUserId', userIds)
      .whereNotNull('bucketId')
      .then(response => response.map(entry => entry.bucketId));
  },

  /**
   * @function searchPermissions
   * Search and filter for specific bucket permissions
   * @param {string|string[]} [params.userId] Optional string or array of uuids representing the user
   * @param {string|string[]} [params.bucketId] Optional string or array of uuids representing the bucket
   * @param {string|string[]} [params.permCode] Optional string or array of permission codes
   * @returns {Promise<object>} The result of running the find operation
   */
  searchPermissions: (params) => {
    return BucketPermission.query()
      .modify('filterUserId', params.userId)
      .modify('filterBucketId', params.bucketId)
      .modify('filterPermissionCode', params.permCode);
  }
};

module.exports = service;
