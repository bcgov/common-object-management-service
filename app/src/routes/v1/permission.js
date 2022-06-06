const routes = require('express').Router();

const { permissionValidator } = require('../../validators');
const { Permissions } = require('../../components/constants');
const { permissionController } = require('../../controllers');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');
const { requireBasicAuth, requireDb } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for object permissions */
routes.get('/', requireBasicAuth, permissionValidator.searchPermissions, (req, res, next) => {
  permissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
routes.get('/:objId', permissionValidator.listPermissions, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  permissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
routes.put('/:objId', permissionValidator.addPermissions, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
routes.delete('/:objId', permissionValidator.removePermissions, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.removePermissions(req, res, next);
});

module.exports = routes;
