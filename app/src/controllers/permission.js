const Problem = require('api-problem');

const errorToProblem = require('../components/errorToProblem');
const { getCurrentOidcId, mixedQueryToArray } = require('../components/utils');
const { permissionService } = require('../services');

const SERVICE = 'PermissionService';

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
      const response = await permissionService.searchPermissions({
        objId: mixedQueryToArray(req.query.objId),
        oidcId: mixedQueryToArray(req.query.oidcId),
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
      const response = await permissionService.searchPermissions({
        objId: req.params.objId,
        oidcId: mixedQueryToArray(req.query.oidcId),
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

      const oidcId = getCurrentOidcId(req.currentUser);
      const response = await permissionService.addPermissions(req.params.objId, req.body, oidcId);
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
      if (!req.query.oidcId || !req.query.permCode) {
        return new Problem(422).send(res);
      }

      const oidcIds = mixedQueryToArray(req.query.oidcId);
      const permissions = mixedQueryToArray(req.query.permCode);
      const response = await permissionService.removePermissions(req.params.objId, oidcIds, permissions);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


};

module.exports = controller;
