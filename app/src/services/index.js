const config = require('config');

/**
 * @function featureNoDb
 * Changes all service methods to be no-op functions if there is no database enabled
 * @param {object} service The service
 * @returns {object} Yields `service` with normal or no-op methods depending if database support is enabled or not
 */
function featureNoDb(service) {
  if (config.has('db.enabled')) { // Passthrough
    return service;
  } else { // Make all functions no-op resolvable promises
    const nullSvc = {};
    Object.keys(service).forEach(attr => {
      if (typeof service[attr] === 'function') {
        nullSvc[attr] = async () => Promise.resolve({});
      } else {
        nullSvc[attr] = service[attr];
      }
    });
    return nullSvc;
  }
}

module.exports = {
  bucketService: featureNoDb(require('./bucket')),
  bucketPermissionService: featureNoDb(require('./bucketPermission')),
  featureNoDb: featureNoDb,
  metadataService: featureNoDb(require('./metadata')),
  objectService: featureNoDb(require('./object')),
  objectQueueService: featureNoDb(require('./objectQueue')),
  objectPermissionService: featureNoDb(require('./objectPermission')),
  storageService: require('./storage'),
  tagService: featureNoDb(require('./tag')),
  userService: featureNoDb(require('./user')),
  versionService: featureNoDb(require('./version')),
};
