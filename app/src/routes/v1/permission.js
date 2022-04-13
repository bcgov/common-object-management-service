const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { permissionController } = require('../../controllers');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');
const { requireBasicAuth, requireDb } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for object permissions */
routes.get('/', requireBasicAuth, (req, res, next) => {
  // TODO: Add validation to ensure at least one query parameter is present
  // TODO: Add validation to reject unexpected query parameters
  permissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
routes.get('/:objId', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  permissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
routes.put('/:objId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  // TODO: Add validation to reject unexpected body parameters/shape
  permissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
routes.delete('/:objId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  permissionController.removePermissions(req, res, next);
});

module.exports = routes;
