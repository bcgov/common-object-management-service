const errorToProblem = require('../components/errorToProblem');
const { userService } = require('../services');

const SERVICE = 'UserService';

const controller = {
  /** Searches for users */
  // TODO: Add more complete query library for user search parameterization
  async userSearch(req, res, next) {
    try {
      const response = await userService.readUser(req.query.oidcId);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
