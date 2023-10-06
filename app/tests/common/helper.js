const express = require('express');
const Problem = require('api-problem');

/**
 * @class helper
 * Provides helper utilities that are commonly used in tests
 */
const helper = {
  /**
   * @function expressHelper
   * Creates a stripped-down simple Express server object
   * @param {string} basePath The path to mount the `router` on
   * @param {object} router An express router object to mount
   * @returns {object} A simple express server object with `router` mounted to `basePath`
   */
  expressHelper: (basePath, router) => {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({
      extended: false
    }));
    app.use(basePath, router);

    // Handle 404
    app.use((req, _res) => { // eslint-disable-line no-unused-vars
      throw new Problem(404, { instance: req.originalUrl });
    });

    // Handle 500
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, _next) => {
      if (err instanceof Problem) {
        err.send(res);
      } else {
        new Problem(500, { detail: err.message ?? err, instance: req.originalUrl }).send(res);
      }
    });

    return app;
  },

  /**
   * @function resetModel
   * Resets a mock objection model
   * @param {object} obj A mock objection model
   * @param {object} trx A mock transaction object
   */
  resetModel: (obj, trx) => {
    // Set all jest functions to return itself
    Object.keys(obj).forEach((f) => {
      if (jest.isMockFunction(obj[f])) obj[f].mockReturnThis();
    });
    obj.startTransaction.mockImplementation(() => trx);
    obj.then.mockImplementation((resolve) => resolve(this));
  },

  /**
   * @function trxBuilder
   * Returns a mock transaction object
   * @returns {object} A mock transaction object
   */
  trxBuilder: () => ({
    commit: jest.fn(),
    rollback: jest.fn()
  })
};

module.exports = helper;
