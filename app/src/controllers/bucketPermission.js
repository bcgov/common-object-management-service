const Problem = require('api-problem');

const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  mixedQueryToArray,
  getCurrentIdentity,
  groupByObject,
  isTruthy
} = require('../components/utils');
const { NIL: SYSTEM_USER } = require('uuid');
const { bucketPermissionService, userService } = require('../services');

const SERVICE = 'BucketPermissionService';

/**
 * The Permission Controller
 */
const controller = {
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

      if (isTruthy(req.query.objectPerms)) { 
        // Iteration through bucket and object permissions. If object permission not found, set empty array.   
        const bucketIds = await bucketPermissionService.getBucketIdsWithObject(userIds);
        
        bucketIds.forEach(bucketId => {
          if (!response.map(r => r.bucketId).includes(bucketId)) {
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
      // TODO: Do this kind of logic in validation layer/library instead
      if (!req.body || !Array.isArray(req.body) || !req.body.length) {
        return new Problem(422).send(res);
      }

      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      const response = await bucketPermissionService.addPermissions(addDashesToUuid(req.params.bucketId), req.body, userId);
      res.status(201).json(response);
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
      // TODO: Do this kind of logic in validation layer/library instead
      if (!req.query.userId || !req.query.permCode) {
        return new Problem(422).send(res);
      }

      const userArray = mixedQueryToArray(req.query.userId);
      const userIds = userArray ? userArray.map(id => addDashesToUuid(id)) : userArray;
      const permissions = mixedQueryToArray(req.query.permCode);
      const response = await bucketPermissionService.removePermissions(req.params.bucketId, userIds, permissions);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


};

module.exports = controller;
