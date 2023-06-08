const { NIL: SYSTEM_USER } = require('uuid');
const errorToProblem = require('../components/errorToProblem');
const utils = require('../components/utils');

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
      const bucketIds = utils.mixedQueryToArray(req.query.bucketId);
      const objIds = utils.mixedQueryToArray(req.query.objectId);
      const permCodes = utils.mixedQueryToArray(req.query.permCode);
      const userIds = utils.mixedQueryToArray(req.query.userId);
      const result = await objectPermissionService.searchPermissions({
        bucketId: bucketIds ? bucketIds.map(id => utils.addDashesToUuid(id)) : bucketIds,
        objId: objIds ? objIds.map(id => utils.addDashesToUuid(id)) : objIds,
        userId: userIds ? userIds.map(id => utils.addDashesToUuid(id)) : userIds,
        permCode: permCodes
      });
      const response = utils.groupByObject('objectId', 'permissions', result);

      // if also returning inheritied permissions
      if (utils.isTruthy(req.query.bucketPerms)) {
        const objectIds = await objectPermissionService.listInheritedObjectIds(userIds, bucketIds, permCodes);

        // merge list of object permissions
        objectIds.forEach(objectId => {
          if (!response.map(r => r.objectId).includes(objectId) &&
            // limit to objectId request query parameter if given
            (!objIds?.length || objIds?.includes(objectId))) {
            response.push({
              objectId: objectId,
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
   * Returns the object permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listPermissions(req, res, next) {
    try {
      const userIds = utils.mixedQueryToArray(req.query.userId);
      const response = await objectPermissionService.searchPermissions({
        objId: utils.addDashesToUuid(req.params.objectId),
        userId: userIds ? userIds.map(id => utils.addDashesToUuid(id)) : userIds,
        permCode: utils.mixedQueryToArray(req.query.permCode)
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
      const userId = await userService.getCurrentUserId(utils.getCurrentIdentity(req.currentUser, SYSTEM_USER));
      const response = await objectPermissionService.addPermissions(utils.addDashesToUuid(req.params.objectId), req.body, userId);
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
      const userArray = utils.mixedQueryToArray(req.query.userId);
      const userIds = userArray ? userArray.map(id => utils.addDashesToUuid(id)) : userArray;
      const permissions = utils.mixedQueryToArray(req.query.permCode);
      const response = await objectPermissionService.removePermissions(req.params.objectId, userIds, permissions);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
