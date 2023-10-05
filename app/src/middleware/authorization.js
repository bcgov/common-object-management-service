const Problem = require('api-problem');

const log = require('../components/log')(module.filename);
const { AuthMode, AuthType, Permissions } = require('../components/constants');
const { getAppAuthMode, getCurrentIdentity } = require('../components/utils');
const { NIL: SYSTEM_USER } = require('uuid');
const { bucketPermissionService, objectService, objectPermissionService, userService } = require('../services');

/**
 * @function _checkPermission
 * Checks if the current user is authorized to perform the operation
 * @param {object} req.currentObject Express request object currentObject
 * @param {object} req.currentUser Express request object currentUser
 * @param {object} req.params Express request object params
 * @param {string} permission The permission to check against
 * @returns {boolean} True if permission exists; false otherwise
 */
const _checkPermission = async ({ currentObject, currentUser, params }, permission) => {
  const authType = currentUser ? currentUser.authType : undefined;
  let result = false;

  // Guard against unauthorized access for all other cases
  const userId = await userService.getCurrentUserId(getCurrentIdentity(currentUser, SYSTEM_USER));

  if (authType === AuthType.BEARER && userId) {
    const permissions = [];
    const searchParams = { permCode: permission, userId: userId };

    if (params.objectId) {
      permissions.push(...await objectPermissionService.searchPermissions({
        objId: params.objectId, ...searchParams
      }));
    }
    if (params.bucketId || currentObject.bucketId) {
      permissions.push(...await bucketPermissionService.searchPermissions({
        bucketId: params.bucketId || currentObject.bucketId, ...searchParams
      }));
    }

    // Check if user has the required permission in their permission set
    result = permissions.some(p => p.permCode === permission);
  }

  log.debug('Missing user identification', { function: '_checkPermission' });
  return result;
};

/**
 * @function checkAppMode
 * Rejects the request if the incoming authentication mode does not match the application mode
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const checkAppMode = (req, _res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.authType : undefined;

  try {
    if (authMode === AuthMode.BASICAUTH && authType === AuthType.BEARER) {
      throw new Error('Basic auth mode does not support Bearer type auth');
    } else if (authMode === AuthMode.OIDCAUTH && authType === AuthType.BASIC) {
      throw new Error('Oidc auth mode does not support Basic type auth');
    }
  } catch (err) {
    log.verbose(err.message, { function: 'checkAppMode', authMode: authMode, authType: authType });
    throw new Problem(501, {
      detail: 'Current application mode does not support incoming authentication type',
      instance: req.originalUrl,
      authMode: authMode,
      authType: authType
    });
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
    if (req.params.objectId) {
      req.currentObject = Object.freeze({
        ...await objectService.read(req.params.objectId)
      });
    }
  } catch (err) {
    log.warn(err.message, { function: 'currentObject' });
  }

  next();
};

/**
 * @function hasPermission
 * function checks:
 * - request is allowed in current auth mode
 * - request contains an objectId or bucketId param
 * - request contains currentObject property if objectId param passed
 * - if objectId param is for a public object and request requires READ permission
 * - if passed permission exists for current user on object or bucket (see: _checkPermission)
 * @param {string} permission a permission code (eg: READ)
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const hasPermission = (permission) => {
  return async (req, _res, next) => {
    const authMode = getAppAuthMode();
    const authType = req.currentUser ? req.currentUser.authType : undefined;

    const canBasicMode = (mode) => [AuthMode.BASICAUTH, AuthMode.FULLAUTH].includes(mode);
    const canOidcMode = (mode) => [AuthMode.OIDCAUTH, AuthMode.FULLAUTH].includes(mode);

    try {
      if (!canOidcMode(authMode)) {
        log.debug('Current application mode does not enforce permission checks', { function: 'hasPermission' });
      } else if (!req.params.objectId && !req.params.bucketId) {
        throw new Error('Missing request parameter(s)');
      } else if (req.params.objectId && !req.currentObject) {
        // Force 403 on unauthorized or not found; do not allow 404 id brute force discovery
        throw new Error('Missing object record');
      } else if (authType === AuthType.BASIC && canBasicMode(authMode)) {
        log.debug('Basic authTypes are always permitted', { function: 'hasPermission' });
      } else if (req.params.objectId && req.currentObject.public && permission === Permissions.READ) {
        log.debug('Read requests on public objects are always permitted', { function: 'hasPermission' });
      } else if (!await _checkPermission(req, permission)) {
        throw new Error(`User lacks required permission ${permission}`);
      }
    } catch (err) {
      log.verbose(err.message, { function: 'hasPermission' });
      return next(new Problem(403, { detail: 'User lacks permission to complete this action', instance: req.originalUrl }));
    }

    next();
  };
};

module.exports = {
  _checkPermission, checkAppMode, currentObject, hasPermission
};
