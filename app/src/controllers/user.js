const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, isTruthy, mixedQueryToArray } = require('../components/utils');
const { userService } = require('../services');

const SERVICE = 'UserService';

/**
 * The User Controller
 */
const controller = {
  /**
   * @function listIdps
   * Lists all known identity providers
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listIdps(req, res, next) {
    try {
      const response = await userService.listIdps({
        active: isTruthy(req.query.active)
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function searchUsers
   * Searches for users
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchUsers(req, res, next) {
    try {
      const userIds = mixedQueryToArray(req.query.userId);
      const response = await userService.searchUsers({
        userId: userIds ? userIds.map(id => addDashesToUuid(id)) : userIds,
        identityId: mixedQueryToArray(req.query.identityId),
        idp: mixedQueryToArray(req.query.idp),
        username: req.query.username,
        email: req.query.email,
        firstName: req.query.firstName,
        fullName: req.query.fullName,
        lastName: req.query.lastName,
        active: isTruthy(req.query.active),
        search: req.query.search
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
