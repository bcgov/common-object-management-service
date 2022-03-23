const Problem = require('api-problem');
const config = require('config');

const log = require('../components/log')(module.filename);
const { AuthMode, AuthType } = require('../components/constants');
const { getAppAuthMode } = require('../components/utils');

/**
 * @function requireBasicAuth
 * Only allows basic authentication requests if application is in the appropriate mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const requireBasicAuth = (req, res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.authType : undefined;

  const canBasicMode = (mode) => [AuthMode.BASICAUTH, AuthMode.FULLAUTH].includes(mode);

  if (authMode === AuthMode.OIDCAUTH) {
    return new Problem(501, { detail: 'This action is not supported in the current authentication mode' }).send(res);
  }

  if (canBasicMode(authMode) && authType !== AuthType.BASIC) {
    return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
  }

  next();
};

/**
 * @function requireDb
 * Rejects the request if the application is running in No Database mode
 * @param {object} _req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const requireDb = (_req, res, next) => {
  const hasDb = config.has('db.enabled');

  try {
    if (!hasDb) throw new Error('Database mode is disabled');
  } catch (err) {
    log.verbose(err.message, { function: 'requireDb', hasDb: hasDb });
    return new Problem(501, {
      detail: 'This operation is not supported while running without a database',
      hasDb: hasDb,
    }).send(res);
  }

  next();
};

module.exports = {
  requireBasicAuth, requireDb
};
