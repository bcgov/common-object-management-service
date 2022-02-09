const Problem = require('api-problem');

const config = require('config');
const log = require('../log')(module.filename);
const { Permissions } = require('../constants');
const service = require('../objectRecordData/service');

/**
 * @function currentObjectRecord
 * Get the DB record for this object being accessed and store in request for use further down the chain
 * @returns {Function} a middleware function
 */
const currentObjectRecord = async (req, res, next) => {
  let record = undefined;
  try {
    // Check if authed, can expand for API key access if needed
    if (req.params.objId) {
      record = await service.read(req.params.objId);
    }
  } catch (error) {
    log.error(`Failed to find object db record for id ${req.params.objId}. Error ${error}`);
  }

  if (!record) {
    // 403 on no auth or file not found (don't 404 for id discovery)
    return next(new Problem(403, { detail: 'Access to this object ID is unauthorized.' }));
  }

  req.currentObjectRecord = record;
  next();
};

/**
 * @function hasPermission
 * Check if the call can be made
 * @returns {Function} a middleware function
 */
const hasPermission = (permission) => {
  return async (req, res, next) => {
    if (!config.has('keycloak.enabled')) {
      return next();
    }

    // If asking to read a public file you're good
    if (req.currentObjectRecord.public && permission === Permissions.READ) {
      return next();
    }

    // Other than the above case, gaurd against unauthed access for anything
    if (!req.currentUser || !req.currentUser.keycloakId) {
      return next(new Problem(403, { detail: 'Unauthorized for this file' }));
    }

    // Permute permissions and check if the permission to check exists for the user making the call
    const permissions = await service.readPermissions(req.params.objId, req.currentUser.keycloakId);
    if (!permissions.some(p => p.code === permission)) {
      return next(new Problem(403, { detail: 'Unauthorized for this file' }));
    }

    next();
  };
};


module.exports = {
  currentObjectRecord, hasPermission
};
