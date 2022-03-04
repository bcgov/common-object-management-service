const Problem = require('api-problem');

const log = require('../components/log')(module.filename);
const { DbMode } = require('../components/constants');
const { getAppDbMode } = require('../components/utils');

/**
 * @function requireDb
 * Rejects the request if the application is running in No Database mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const requireDb = (req, res, next) => {
  const dbMode = getAppDbMode();

  try {
    if (dbMode === DbMode.DISABLED) {
      throw new Error('Database mode is disabled');
    }
  } catch (err) {
    log.verbose(err.message, { function: 'requireDb', dbMode: dbMode });
    return new Problem(501, {
      detail: 'This operation isn\'t supported in No Database mode',
      dbMode: dbMode,
    }).send(res);
  }

  next();
};

module.exports = {
  requireDb
};
