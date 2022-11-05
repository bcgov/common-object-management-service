const routes = require('express').Router();

const { Permissions } = require('../../../components/constants');
const { permissionController } = require('../../../controllers');
const { bucketPermissionValidator } = require('../../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../../middleware/authorization');
const { requireBasicAuth, requireDb, requireSomeAuth } = require('../../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for bucket permissions */
routes.get('/', requireBasicAuth, bucketPermissionValidator.searchPermissions, (req, res, next) => {
  permissionController.searchPermissions(req, res, next);
});

/** Returns the bucket permissions */
routes.get('/:bucketId', requireSomeAuth, currentObject, hasPermission(Permissions.READ), bucketPermissionValidator.listPermissions, (req, res, next) => {
  permissionController.listPermissions(req, res, next);
});

/** Grants bucket permissions to users */
routes.put('/:bucketId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), bucketPermissionValidator.addPermissions, (req, res, next) => {
  permissionController.addPermissions(req, res, next);
});

/** Deletes bucket permissions for a user */
routes.delete('/:bucketId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), bucketPermissionValidator.removePermissions, (req, res, next) => {
  permissionController.removePermissions(req, res, next);
});

module.exports = routes;
