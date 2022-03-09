const Problem = require('api-problem');

const config = require('config');
const log = require('../components/log')(module.filename);
const { AuthMode, AuthType, Permissions } = require('../components/constants');
const { getAppAuthMode, getPath } = require('../components/utils');
const { objectService, permissionService, storageService } = require('../services');

/**
 * @function checkAppMode
 * Rejects the request if the incoming authentication mode does not match the application mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const checkAppMode = (req, res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.AuthType : undefined;

  try {
    if (authMode === AuthMode.BASICAUTH && authType === AuthType.BEARER) {
      throw new Error('Basic auth mode does not support Bearer type auth');
    } else if (authMode === AuthMode.OIDCAUTH && authType === AuthType.BASIC) {
      throw new Error('Oidc auth mode does not support Basic type auth');
    }
  } catch (err) {
    log.verbose(err.message, { function: 'checkAppMode', authMode: authMode, authType: authType });
    return new Problem(501, {
      detail: 'Current application mode does not support incoming authentication type',
      authMode: authMode,
      authType: authType
    }).send(res);
  }

  next();
};

/**
 * @function currentObject
 * Injects a currentObject object to the request if there is an applicable object record
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const currentObject = async (req, _res, next) => {
  try {
    if (req.params.objId) {
      req.currentObject = Object.freeze({
        ...await objectService.read(req.params.objId),
        ...await storageService.headObject({ filePath: getPath(req.params.objId) })
      });
    }
  } catch (err) {
    log.warn(err.message, { function: 'currentObject' });
  }

  next();
};

/**
 * @function hasPermission
 * Checks if the current user is authorized to perform the operation
 * @param {string} permission The permission to check against
 * @returns {function} Express middleware function
 */
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (config.has('db.enabled') && config.has('keycloak.enabled')) {
        if (!req.currentObject) {
          // Force 403 on unauthorized or not found; do not allow 404 id brute force discovery
          throw new Error('Missing object record');
        }

        // Only skip permission check if object is public and read permission is requested
        if (!req.currentObject.public || !permission === Permissions.READ) {
          // Other than the above case, guard against unauthed access for everything else
          const authType = req.currentUser ? req.currentUser.authType : undefined;
          const sub = req.currentUser.tokenPayload ? req.currentUser.tokenPayload.sub : undefined;

          if (authType && authType === AuthType.BEARER && sub) {
            // Check if user has the required permission in their permission set
            const permissions = await permissionService.searchPermissions({
              objId: req.params.objId,
              oidcId: sub
            });

            if (!permissions.some(p => p.permCode === permission)) {
              throw new Error(`User lacks permission '${permission}' on object '${req.params.objId}'`);
            }
          } else {
            throw new Error('Missing user identification');
          }
        }
      }
    } catch (err) {
      log.verbose(err.message, { function: 'hasPermission' });
      return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
    }

    next();
  };
};

/**
 * @function isBasicAuth
 * Only allows basic authentication requests if application is in the appropriate mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const isBasicAuth = (req, res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.authType : undefined;

  if (authMode === AuthMode.OIDCAUTH) {
    return new Problem(501, { detail: 'This action is not supported in the current authentication mode' }).send(res);
  }

  if (authMode === AuthMode.BASICAUTH || authMode === AuthMode.FULLAUTH && authType !== AuthType.BASIC) {
    return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
  }

  next();
};

module.exports = {
  checkAppMode, currentObject, hasPermission, isBasicAuth
};
