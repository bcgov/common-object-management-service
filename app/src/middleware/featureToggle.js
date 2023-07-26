const Problem = require('api-problem');

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
 * @function requireSomeAuth
 * Rejects the request if there is no authorization in the appropriate mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const requireSomeAuth = (req, res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.authType : undefined;

  if (authMode !== AuthMode.NOAUTH && (!authType || authType === AuthType.NONE)) {
    return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
  }

  next();
};

module.exports = {
  requireBasicAuth, requireSomeAuth
};
