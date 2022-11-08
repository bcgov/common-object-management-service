const routes = require('express').Router();

const { Permissions } = require('../../../components/constants');
const { objectPermissionController } = require('../../../controllers');
const { objectPermissionValidator } = require('../../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../../middleware/authorization');
const { requireBasicAuth, requireDb, requireSomeAuth } = require('../../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for object permissions */
routes.get('/', requireBasicAuth, objectPermissionValidator.searchPermissions, (req, res, next) => {
  objectPermissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
routes.get('/:objId', requireSomeAuth, currentObject, hasPermission(Permissions.READ), objectPermissionValidator.listPermissions, (req, res, next) => {
  objectPermissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
routes.put('/:objId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), objectPermissionValidator.addPermissions, (req, res, next) => {
  objectPermissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
routes.delete('/:objId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), objectPermissionValidator.removePermissions, (req, res, next) => {
  objectPermissionController.removePermissions(req, res, next);
});

module.exports = routes;
