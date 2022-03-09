const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { permissionController } = require('../../controllers');
const { checkAppMode, currentObject, hasPermission, isBasicAuth } = require('../../middleware/authorization');

routes.use(checkAppMode);

/** Search for object permissions */
routes.get('/', isBasicAuth, (req, res, next) => {
  permissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
routes.get('/:objId', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  permissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
routes.put('/:objId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
routes.delete('/:objId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.removePermissions(req, res, next);
});

module.exports = routes;
