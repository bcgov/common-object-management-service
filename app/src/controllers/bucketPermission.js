const { Permissions } = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const utils = require('../db/models/utils');
const {
  addDashesToUuid,
  mixedQueryToArray,
  getCurrentIdentity,
  groupByObject,
  isTruthy
} = require('../components/utils');
const { NIL: SYSTEM_USER } = require('uuid');
const { bucketPermissionService, userService, bucketService } = require('../services');

const SERVICE = 'BucketPermissionService';

/**
 * The Permission Controller
 */
const controller = {

  /**
   * Gets all child bucket records for a given bucket, where the specified user
   * has MANAGE permission on said child buckets.
   * @param {string} parentBucketId bucket id of the parent bucket
   * @param {string} userId user id
   * @returns {Promise<object[]>} An array of bucket records that are children of the parent,
   *                              where the user has MANAGE permissions.
   */
  async _getChildrenWithManagePerms(parentBucketId, userId) {

    const parentBucket = await bucketService.read(parentBucketId);
    const allChildren = await bucketService.searchChildBuckets(parentBucket, true, userId);

    const filteredChildren = allChildren.filter(bucket =>
      bucket.bucketPermission?.some(perm => perm.userId === userId && perm.permCode === Permissions.MANAGE)
    );

    return filteredChildren;
  },

  /**
   * @function searchPermissions
   * Searches for bucket permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchPermissions(req, res, next) {
    try {
      const bucketIds = mixedQueryToArray(req.query.bucketId);
      const userIds = mixedQueryToArray(req.query.userId);
      const bucketPermissions = await bucketPermissionService.searchPermissions({
        bucketId: bucketIds ? bucketIds.map(id => addDashesToUuid(id)) : bucketIds,
        userId: userIds ? userIds.map(id => addDashesToUuid(id)) : userIds,
        permCode: mixedQueryToArray(req.query.permCode)
      });
      const response = groupByObject('bucketId', 'permissions', bucketPermissions);

      // if also returning buckets with implicit object permissions
      if (isTruthy(req.query.objectPerms)) {
        const buckets = await bucketPermissionService.listInheritedBucketIds(userIds);

        // merge list of bucket permissions
        buckets.forEach(bucketId => {
          if (!response.map(r => r.bucketId).includes(bucketId) &&
            // limit to to bucketId(s) request query parameter if given
            (!bucketIds?.length || bucketIds?.includes(bucketId))) {
            response.push({
              bucketId: bucketId,
              permissions: []
            });
          }
        });
      }

      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function listPermissions
   * Returns the bucket permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listPermissions(req, res, next) {
    try {
      const userIds = mixedQueryToArray(req.query.userId);
      const response = await bucketPermissionService.searchPermissions({
        bucketId: addDashesToUuid(req.params.bucketId),
        userId: userIds ? userIds.map(id => addDashesToUuid(id)) : userIds,
        permCode: mixedQueryToArray(req.query.permCode)
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function addPermissions
   * Grants bucket permissions to users
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async addPermissions(req, res, next) {
    try {
      const currUserId = await userService.getCurrentUserId(
        getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
      const currBucketId = addDashesToUuid(req.params.bucketId);

      if (isTruthy(req.query.recursive)) {

        const parentBucket = await bucketService.read(currBucketId);

        // Only apply permissions to child buckets that currentUser can MANAGE
        // If the current user is SYSTEM_USER, apply permissions to all child buckets
        const childBuckets = currUserId !== SYSTEM_USER ?
          await this._getChildrenWithManagePerms(currBucketId, currUserId) :
          await bucketService.searchChildBuckets(parentBucket, true, currUserId);

        const allBuckets = [parentBucket, ...childBuckets];

        const responses = await utils.trxWrapper(async (trx) => {
          return await Promise.all(
            allBuckets.map(b =>
              bucketPermissionService.addPermissions(b.bucketId, req.body, currUserId, trx)
            )
          );
        });
        res.status(201).json(responses.flat());
      }
      else {
        const response = await bucketPermissionService.addPermissions(
          currBucketId, req.body, currUserId);
        res.status(201).json(response);
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function removePermissions
   * Deletes bucket permissions for a user
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async removePermissions(req, res, next) {
    try {
      const userArray = mixedQueryToArray(req.query.userId);
      const userIds = userArray ? userArray.map(id => addDashesToUuid(id)) : userArray;
      const permissions = mixedQueryToArray(req.query.permCode);

      const currUserId = await userService.getCurrentUserId(
        getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
      const currBucketId = addDashesToUuid(req.params.bucketId);

      if (isTruthy(req.query.recursive)) {

        const parentBucket = await bucketService.read(currBucketId);
        // Only apply permissions to child buckets that currentUser can MANAGE
        // If the current user is SYSTEM_USER, apply permissions to all child buckets
        const childBuckets = currUserId !== SYSTEM_USER ?
          await this._getChildrenWithManagePerms(currBucketId, currUserId) :
          await bucketService.searchChildBuckets(parentBucket, true, currUserId);

        const allBuckets = [parentBucket, ...childBuckets];

        const responses = await utils.trxWrapper(async (trx) => {
          return await Promise.all(
            allBuckets.map(b =>
              bucketPermissionService.removePermissions(b.bucketId, userIds, permissions, trx)
            )
          );
        });
        res.status(200).json(responses.flat());
      }
      else {
        const response = await bucketPermissionService.removePermissions(currBucketId, userIds, permissions);
        res.status(200).json(response);
      }

    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
