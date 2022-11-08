const Problem = require('api-problem');

const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  mixedQueryToArray,
  getCurrentIdentity
} = require('../components/utils');
const { NIL: SYSTEM_USER } = require('uuid');
const { objectPermissionService, userService } = require('../services');

const SERVICE = 'ObjectPermissionService';

/**
 * The Permission Controller
 */
const controller = {
  /**
   * @function searchPermissions
   * Searches for object permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchPermissions(req, res, next) {
    try {
      const objIds = mixedQueryToArray(req.query.objId);
      const userIds = mixedQueryToArray(req.query.userId);
      const response = await objectPermissionService.searchPermissions({
        objId: objIds ? objIds.map(id => addDashesToUuid(id)) : objIds,
        userId: userIds ? userIds.map(id => addDashesToUuid(id)) : userIds,
        permCode: mixedQueryToArray(req.query.permCode)
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function listPermissions
   * Returns the object permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listPermissions(req, res, next) {
    try {
      const userIds = mixedQueryToArray(req.query.userId);
      const response = await objectPermissionService.searchPermissions({
        objId: addDashesToUuid(req.params.objId),
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
   * Grants object permissions to users
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
      const response = await objectPermissionService.addPermissions(addDashesToUuid(req.params.objId), req.body, userId);
      res.status(201).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function removePermissions
   * Deletes object permissions for a user
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
      const response = await objectPermissionService.removePermissions(req.params.objId, userIds, permissions);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


};

module.exports = controller;
