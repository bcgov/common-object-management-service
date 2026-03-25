const { NIL: SYSTEM_USER } = require('uuid');
const errorToProblem = require('../components/errorToProblem');
const utils = require('../components/utils');

const { objectIdpPermissionService, userService } = require('../services');

const SERVICE = 'ObjectIdpPermissionService';

/**
 * The Object IDP Permission Controller
 */
const controller = {
  /**
   * @function searchPermissions
   * Searches for object permissions granted to idps
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
      const idps = utils.mixedQueryToArray(req.query.idp);
      const result = await objectIdpPermissionService.searchPermissions({
        bucketId: bucketIds ? bucketIds.map(id => utils.addDashesToUuid(id)) : bucketIds,
        objId: objIds ? objIds.map(id => utils.addDashesToUuid(id)) : objIds,
        idp: idps,
        permCode: permCodes
      });
      const response = utils.groupByObject('objectId', 'permissions', result);

      // if also returning inheritied permissions
      if (utils.isTruthy(req.query.bucketPerms)) {
        const objectIds = await objectIdpPermissionService.listInheritedObjectIds(idps, bucketIds, permCodes);

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
      const idps = utils.mixedQueryToArray(req.query.idp);
      const response = await objectIdpPermissionService.searchPermissions({
        objId: utils.addDashesToUuid(req.params.objectId),
        idp: idps,
        permCode: utils.mixedQueryToArray(req.query.permCode)
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function addPermissions
   * Grants object permissions to idps
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async addPermissions(req, res, next) {
    try {
      const userId = await userService.getCurrentUserId(utils.getCurrentIdentity(req.currentUser, SYSTEM_USER));
      const response = await objectIdpPermissionService.addPermissions(
        utils.addDashesToUuid(req.params.objectId), req.body, userId
      );
      res.status(201).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function removePermissions
   * Deletes object permissions for a idp
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async removePermissions(req, res, next) {
    try {
      const idps = utils.mixedQueryToArray(req.query.idp);
      const permissions = utils.mixedQueryToArray(req.query.permCode);
      const response = await objectIdpPermissionService.removePermissions(req.params.objectId, idps, permissions);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
