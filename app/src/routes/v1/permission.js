/* eslint-disable no-unused-vars */
const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { permissionController } = require('../../controllers');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');

routes.use(checkAppMode);

/** Searches for object permissions */
routes.get('/', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  permissionController.objectPermissionSearch(req, res, next);
});

/** Returns the object permissions */
routes.get('/:objId', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  permissionController.objectPermission(req, res, next);
});

/** Grants object permissions to a specific user */
routes.post('/:objId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.addPermission(req, res, next);
});

/** Deletes object permissions for a specific user */
routes.delete('/:objId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.removePermission(req, res, next);
});

module.exports = routes;
