const Problem = require('api-problem');

const config = require('config');
const log = require('../components/log')(module.filename);
const { AuthType, Permissions } = require('../components/constants');
const { getPath } = require('../components/utils');
const { recordService, storageService } = require('../services');

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
        ...await recordService.read(req.params.objId),
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
    // TODO: Only execute this if app is running in mode where db is needed
    try {
      // TODO: Ensure there are escape hatches for BASICAUTH and NOAUTH modes
      if (config.has('keycloak.enabled')) {
        if (!req.currentObject) {
          // Force 403 on unauthorized or not found; do not allow 404 id brute force discovery
          throw new Error('Missing object record');
        }

        // Only skip permission check if object is public and read permission is requested
        if (!req.currentObject.public || !permission === Permissions.READ) {
          // Other than the above case, guard against unauthed access for everything else
          if (req.currentUser && req.currentUser.authType === AuthType.BEARER
            && req.currentUser.tokenPayload && req.currentUser.tokenPayload.sub) {
            // Check if user has the required permission in their permission set
            const permissions = await recordService.readPermissions(req.params.objId, req.currentUser.tokenPayload.sub);
            if (!permissions.some(p => p.code === permission)) {
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

module.exports = {
  currentObject, hasPermission
};
