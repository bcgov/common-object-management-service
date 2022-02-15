const Problem = require('api-problem');

const config = require('config');
const e = require('express');
const log = require('../components/log')(module.filename);
const { AuthType, Permissions } = require('../components/constants');
const { recordService } = require('../services');

/**
 * @function currentObject
 * Injects a currentObject object to the request if there is an applicable object record
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const currentObject = async (req, res, next) => {
  if (config.has('keycloak.enabled')) {
    try {
      if (req.params.objId) {
        req.currentObject = await recordService.read(req.params.objId);
      }

    } catch (err) {
      // eslint-disable-line no-empty
    }
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
      if (config.has('keycloak.enabled')) {
        if (!req.currentObject) {
          // Force 403 on unauthorized or not found; do not allow 404 id brute force discovery
          throw new Error('Missing object record');
        }

        // Only skip permission check if object is public and read permission is requested
        if (!req.currentObject.public || !permission === Permissions.READ) {
          // Other than the above case, guard against unauthed access for everything else
          if (req.currentUser && req.currentUser.authType === AuthType.BEARER
            && req.currentUser.tokenPayload && req.currentUser.tokenPayload.oidcId) {
            // Check if user has the required permission in their permission set
            const permissions = await recordService.readPermissions(req.params.objId, req.currentUser.oidcId);
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
