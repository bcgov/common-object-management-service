const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { permissionController } = require('../../controllers');
const { permissionValidator } = require('../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');
const { requireBasicAuth, requireDb, requireSomeAuth } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for object permissions */
routes.get('/', requireBasicAuth, permissionValidator.searchPermissions, (req, res, next) => {
  permissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
routes.get('/:objId', requireSomeAuth, currentObject, hasPermission(Permissions.READ), permissionValidator.listPermissions, (req, res, next) => {
  permissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
routes.put('/:objId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), permissionValidator.addPermissions, (req, res, next) => {
  permissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
routes.delete('/:objId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), permissionValidator.removePermissions, (req, res, next) => {
  permissionController.removePermissions(req, res, next);
});

module.exports = routes;
