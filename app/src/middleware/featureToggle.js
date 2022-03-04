const Problem = require('api-problem');
const config = require('config');
const log = require('../components/log')(module.filename);

/**
 * @function requireDb
 * Rejects the request if the application is running in No Database mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const requireDb = (req, res, next) => {
  const hasDb = config.has('db.enabled');

  try {
    if (!hasDb) {
      throw new Error('Database mode is disabled');
    }
  } catch (err) {
    log.verbose(err.message, { function: 'requireDb', hasDb: hasDb });
    return new Problem(501, {
      detail: 'This operation isn\'t supported in No Database mode',
      hasDb: hasDb,
    }).send(res);
  }

  next();
};

module.exports = {
  requireDb
};
