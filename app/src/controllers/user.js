const errorToProblem = require('../components/errorToProblem');
const { mixedQueryToArray } = require('../components/utils');
const { userService } = require('../services');

const SERVICE = 'UserService';

/**
 * The User Controller
 */
const controller = {
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
      const response = await userService.searchUsers({
        userId: mixedQueryToArray(req.query.userId),
        identityId: mixedQueryToArray(req.query.identityId),
        idp: mixedQueryToArray(req.query.idp),
        username: req.query.username,
        email: req.query.email,
        firstName: req.query.firstName,
        fullName: req.query.fullName,
        lastName: req.query.lastName,
        active: req.query.active,
        search: req.query.search
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
