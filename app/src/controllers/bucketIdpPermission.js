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
const { bucketIdpPermissionService, userService, bucketService } = require('../services');

const SERVICE = 'BucketIdpPermissionService';

/**
 * The Permission Controller
 */
const controller = {

  /**
   * @function searchPermissions
   * Searches for bucket permissions granted to idps
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchPermissions(req, res, next) {
    try {
      const bucketIds = mixedQueryToArray(req.query.bucketId);
      const idps = mixedQueryToArray(req.query.idp);
      const bucketPermissions = await bucketIdpPermissionService.searchPermissions({
        bucketId: bucketIds ? bucketIds.map(id => addDashesToUuid(id)) : bucketIds,
        idp: idps,
        permCode: mixedQueryToArray(req.query.permCode)
      });
      const response = groupByObject('bucketId', 'permissions', bucketPermissions);

      // if also returning buckets with implicit object permissions
      if (isTruthy(req.query.objectPerms)) {

        const buckets = await bucketIdpPermissionService.listInheritedBucketIds(idps);
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
      const idps = mixedQueryToArray(req.query.idp);
      const response = await bucketIdpPermissionService.searchPermissions({
        bucketId: addDashesToUuid(req.params.bucketId),
        idp: idps,
        permCode: mixedQueryToArray(req.query.permCode)
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function addPermissions
   * Grants bucket permissions to idps
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
          await bucketService.getChildrenWithManagePermissions(currBucketId, currUserId) :
          await bucketService.searchChildBuckets(parentBucket, true, currUserId);

        const allBuckets = [parentBucket, ...childBuckets];

        const responses = await utils.trxWrapper(async (trx) => {
          return await Promise.all(
            allBuckets.map(b =>
              bucketIdpPermissionService.addPermissions(b.bucketId, req.body, currUserId, trx)
            )
          );
        });
        res.status(201).json(responses.flat());
      }
      else {
        const response = await bucketIdpPermissionService.addPermissions(
          currBucketId, req.body, currUserId);
        res.status(201).json(response);
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function removePermissions
   * Deletes bucket permissions for a idp
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async removePermissions(req, res, next) {
    try {
      const idps = mixedQueryToArray(req.query.idp);
      const permissions = mixedQueryToArray(req.query.permCode);

      const currUserId = await userService.getCurrentUserId(
        getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
      const currBucketId = addDashesToUuid(req.params.bucketId);

      if (isTruthy(req.query.recursive)) {

        const parentBucket = await bucketService.read(currBucketId);
        // Only apply permissions to child buckets that currentUser can MANAGE
        // If the current user is SYSTEM_USER, apply permissions to all child buckets
        const childBuckets = currUserId !== SYSTEM_USER ?
          await bucketService.getChildrenWithManagePermissions(currBucketId, currUserId) :
          await bucketService.searchChildBuckets(parentBucket, true, currUserId);

        const allBuckets = [parentBucket, ...childBuckets];

        const responses = await utils.trxWrapper(async (trx) => {
          return await Promise.all(
            allBuckets.map(b =>
              bucketIdpPermissionService.removePermissions(b.bucketId, idps, permissions, trx)
            )
          );
        });
        res.status(200).json(responses.flat());
      }
      else {
        const response = await bucketIdpPermissionService.removePermissions(currBucketId, idps, permissions);
        res.status(200).json(response);
      }

    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
