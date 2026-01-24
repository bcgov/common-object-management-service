const Problem = require('api-problem');

const log = require('../components/log')(module.filename);
const { AuthMode, AuthType, Permissions, ElevatedIdps } = require('../components/constants');
const {
  getAppAuthMode,
  getCurrentIdentity,
  getConfigBoolean,
  hasOnlyPermittedKeys,
  mixedQueryToArray,
  stripDelimit
} = require('../components/utils');
const { NIL: SYSTEM_USER } = require('uuid');
const {
  bucketPermissionService,
  objectService,
  objectPermissionService,
  userService, bucketService } = require('../services');

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
      // add object permissions
      permissions.push(...await objectPermissionService.searchPermissions({
        objId: params.objectId, ...searchParams
      }));
    }
    if (params.bucketId || currentObject.bucketId) {
      // add bucket permissions
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
 * @function checkS3BasicAccess
 * Checks and authorized access to perform operation for s3 basic authentication request
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 * @returns
 */
const checkS3BasicAccess = async (req, _res, next) => {
  const authType = req.currentUser ? req.currentUser.authType : undefined;
  const bucketSettings = req.currentUser?.bucketSettings ? req.currentUser.bucketSettings : undefined;

  if (getConfigBoolean('basicAuth.s3AccessMode') && authType === AuthType.BASIC && bucketSettings) {
    // determine which buckets relate to the request
    let bucketIds = mixedQueryToArray(req.query.bucketId)
      || mixedQueryToArray(req.params.bucketId) || req.body.bucketId;
    const objIds = mixedQueryToArray(req.query.objectId) || mixedQueryToArray(req.params.objectId) || req.body.objectId;
    const versionIds = mixedQueryToArray(req.query.versionId);
    const s3VersionIds = mixedQueryToArray(req.query.s3VersionId);

    if (!bucketIds?.length) {
      if (objIds?.length || versionIds?.length || s3VersionIds?.length) {
        const objects = await objectService.searchObjects({
          id: objIds, versionId: versionIds, s3VersionId: s3VersionIds
        });
        bucketIds = objects.data.map(i => i.bucketId);
      }
    }

    // filter request by buckets matching provided credentials
    try {
      const bucketData = {
        bucketId: bucketIds,
        bucket: bucketSettings.bucket,
        endpoint: stripDelimit(bucketSettings.endpoint),
        accessKeyId: bucketSettings.accessKeyId,
      };
      const buckets = await bucketService.checkBucketBasicAccess(bucketData);

      if (buckets.length != 0) {
        //bucketId params will be overwritten with passed or valid access bucketId.
        req.query.bucketId = buckets.length > 1 ? buckets : buckets[0];
      } else {
        return next(new Problem(403, { detail: 'Invalid authorization credentials', instance: req.originalUrl }));
      }
    } catch (err) {
      return next(new Problem(403, { detail: err.message, instance: req.originalUrl }));
    }
  }
  next();
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
      }
      // if reading a public object
      else if (req.params.objectId && await isObjectPublic(req.currentObject) && permission === Permissions.READ) {
        log.debug('Read requests on public objects are always permitted', { function: 'hasPermission' });
      }
      // if reading a public bucket
      else if (req.params.bucketId && await isBucketPublic(req.params.bucketId) && permission === Permissions.READ) {
        log.debug('Read requests on public buckets are always permitted', { function: 'hasPermission' });
      }
      else if (!await _checkPermission(req, permission)) {
        throw new Error(`User lacks required permission ${permission}`);
      }
    } catch (err) {
      log.verbose(err.message, { function: 'hasPermission' });
      return next(new Problem(403, {
        detail: `User lacks permission to complete this action: ${err}`,
        instance: req.originalUrl
      }));
    }

    next();
  };
};

/**
 * if in strict mode, when non-idir auth, require one or more of the following query parameters:
 * - complete email address
 * - userId
 * - identityId
 *
 * This restriction ensures that a non-idir user cannot expose other external user's names and email addresses
 * through a user search without knowing their full email, userId or identityId
 */
const restrictNonIdirUserSearch = async (req, _res, next) => {
  try {
    if (getConfigBoolean('server.privacyMask') &&
      req.currentUser.authType === AuthType.BEARER &&
      !ElevatedIdps.includes(req.currentUser.tokenPayload.identity_provider) &&
      !hasOnlyPermittedKeys(req.query, ['email', 'userId', 'identityId'])
    ) {
      throw new Error('User lacks permission to complete this action');
    }
  }
  catch (err) {
    log.verbose(err.message, { function: 'restrictNonIdirUserSearch' });
    return next(new Problem(403, {
      detail: err.message,
      instance: req.originalUrl
    }));
  }

  // if searching by email address,
  // add a query parameter indicating that email parameter must have an exact match
  if (Object.prototype.hasOwnProperty.call(req.query, 'email')) req.query.emailExact = true;

  next();
};

/**
 * If privacyMask (soon to be renamed as 'strictMode' to support additional feature restroctions)
 * is true and request is from a non-idir user, throw a permission error
 */
const checkElevatedUser = async (req, _res, next) => {
  try {
    if (getConfigBoolean('server.privacyMask') &&
      req.currentUser.authType === AuthType.BEARER &&
      !ElevatedIdps.includes(req.currentUser.tokenPayload.identity_provider)) {
      throw new Error('User lacks permission to complete this action');
    }
  }
  catch (err) {
    log.verbose(err.message, { function: 'checkElevatedUser' });
    return next(new Problem(403, {
      detail: err.message,
      instance: req.originalUrl
    }));
  }
  next();
};

/**
 * get public status from COMS database
 * checks current object and all parent folders
 */
const isObjectPublic = async (currentObject) => {
  if (currentObject.public) return true;
  if (await isBucketPublic(currentObject.bucketId)) return true;
  return false;
};

/**
 * get public status from COMS database
 * checks current folder and all parent folders
 */
const isBucketPublic = async (bucketId) => {
  const bucket = await bucketService.read(bucketId);
  if (bucket.public) return true;
  const parentBuckets = await bucketService.searchParentBuckets(bucket);
  if (parentBuckets.some(b => b.public)) return true;
  return false;
};

module.exports = {
  _checkPermission,
  checkAppMode,
  checkElevatedUser,
  checkS3BasicAccess,
  currentObject,
  hasPermission,
  isBucketPublic,
  isObjectPublic,
  restrictNonIdirUserSearch,
};
