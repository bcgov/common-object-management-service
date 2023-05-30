const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { Permissions } = require('../components/constants');
const { BucketPermission, ObjectPermission } = require('../db/models');

/**
 * The Object Permission DB Service
 */
const service = {
  /**
   * @function addPermissions
   * Grants object permissions to users
   * @param {string} objId The objectId uuid
   * @param {object[]} data Incoming array of `userId` and `permCode` tuples to add for this `objId`
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addPermissions: async (objId, data, currentUserId = SYSTEM_USER, etrx = undefined) => {
    if (!objId) {
      throw new Error('Invalid objId supplied');
    }
    if (!data || !Array.isArray(data) || !data.length) {
      throw new Error('Invalid data supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await ObjectPermission.startTransaction();

      // Get existing permissions for the current object
      const currentPerms = await service.searchPermissions({ objId });
      const obj = data
        // Ensure all codes are upper cased
        .map(p => ({ ...p, code: p.permCode.toUpperCase().trim() }))
        // Filter out any invalid code values
        .filter(p => Object.values(Permissions).some(perm => perm === p.permCode))
        // Filter entry tuples that already exist
        .filter(p => !currentPerms.some(cp => cp.userId === p.userId && cp.permCode === p.permCode))
        // Create DB objects to insert
        .map(p => ({
          id: uuidv4(),
          userId: p.userId,
          objectId: objId,
          permCode: p.permCode,
          createdBy: currentUserId,
        }));

      // Insert missing entries
      let response = [];
      if (obj.length) {
        response = await ObjectPermission.query(trx).insertAndFetch(obj);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function listInheritedObjectIds
   * Get objects that are in bucket(s) with given permission(s) for given user(s)
   * with given permission(s) for given user(s).
   * @param {string[]} [params.userIds] Optional array of user id(s)
   * @param {string[]} [params.bucketIds] Optional array of bucket id(s)
   * @param {string[]} [params.permCodes] Optional array of PermCode(s)
   * @returns {Promise<object>} The result of running the find operation
  */
  listInheritedObjectIds: async (userIds = [], bucketIds = [], permCodes = []) => {
    return BucketPermission.query()
      .distinct('object.id AS objectId')
      .rightJoin('object', 'bucket_permission.bucketId', '=', 'object.bucketId')
      .modify((query) => {
        if (userIds.length) query.modify('filterUserId', userIds);
      })
      .modify((query) => {
        if (bucketIds.length) query.whereIn('bucket_permission.bucketId', bucketIds);
        if (permCodes.length) query.whereIn('bucket_permission.permCode', permCodes);
      })
      .then(response => response.map(entry => entry.objectId));
  },

  /**
   * @function removePermissions
   * Deletes object permissions for a user
   * @param {string} objId The objectId uuid
   * @param {string[]} [userIds=undefined] Optional incoming array of user userId uuids to change
   * @param {string[]} [permissions=undefined] An optional array of permission codes to remove; defaults to undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  removePermissions: async (objId, userIds = undefined, permissions = undefined, etrx = undefined) => {
    if (!objId) {
      throw new Error('Invalid objId supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await ObjectPermission.startTransaction();

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

      const response = await ObjectPermission.query(trx)
        .delete()
        .modify('filterUserId', userIds)
        .modify('filterObjectId', objId)
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
   * @function searchPermissions
   * Search and filter for specific object permissions
   * @param {string|string[]} [params.bucketId] Optional string or array of uuids representing the bucket
   * @param {string|string[]} [params.userId] Optional string or array of uuids representing the user
   * @param {string|string[]} [params.objId] Optional string or array of uuids representing the object
   * @param {string|string[]} [params.permCode] Optional string or array of permission codes
   * @returns {Promise<object>} The result of running the find operation
   */
  searchPermissions: (params) => {
    return ObjectPermission.query()
      .modify('filterBucketId', params.bucketId)
      .modify('filterUserId', params.userId)
      .modify('filterObjectId', params.objId)
      .modify('filterPermissionCode', params.permCode);
  }
};

module.exports = service;
