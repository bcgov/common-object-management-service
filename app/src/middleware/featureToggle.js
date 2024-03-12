const Problem = require('api-problem');

const { AuthMode, AuthType } = require('../components/constants');
const { getAppAuthMode } = require('../components/utils');

/**
 * @function requireBasicAuth
 * Only allows basic authentication requests if application is in the appropriate mode
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const requireBasicAuth = (req, _res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser?.authType;

  const canBasicMode = (mode) => [AuthMode.BASICAUTH, AuthMode.FULLAUTH].includes(mode);

  if (authMode === AuthMode.OIDCAUTH) {
    throw new Problem(501, {
      detail: 'This action is not supported in the current authentication mode',
      instance: req.originalUrl
    });
  }

  if (canBasicMode(authMode) && authType !== AuthType.BASIC) {
    throw new Problem(403, {
      detail: 'This action requires basic authentication',
      instance: req.originalUrl
    });
  }

  next();
};

/**
 * @function requireBearerAuth
 * Only allows bearer authentication requests if application is in the appropriate mode
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const requireBearerAuth = (req, _res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser?.authType;

  const canBearerMode = (mode) => [AuthMode.OIDCAUTH, AuthMode.FULLAUTH].includes(mode);

  if (authMode === AuthMode.BASICAUTH) {
    throw new Problem(501, {
      detail: 'This action is not supported in the current authentication mode',
      instance: req.originalUrl
    });
  }

  if (canBearerMode(authMode) && authType !== AuthType.BEARER) {
    throw new Problem(403, {
      detail: 'This action requires bearer authentication',
      instance: req.originalUrl
    });
  }

  next();
};

/**
 * @function requireSomeAuth
 * Rejects the request if there is no authorization in the appropriate mode
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const requireSomeAuth = (req, _res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.authType : undefined;

  if (authMode !== AuthMode.NOAUTH && (!authType || authType === AuthType.NONE)) {
    throw new Problem(403, {
      detail: 'User lacks permission to complete this action',
      instance: req.originalUrl
    });
  }

  next();
};

module.exports = {
  requireBasicAuth, requireBearerAuth, requireSomeAuth
};
