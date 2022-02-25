/* eslint-disable no-unused-vars */
const routes = require('express').Router();
const Problem = require('api-problem');

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { currentObject, hasPermission } = require('../../middleware/authorization');

/** Creates new objects */
routes.post('/', (req, res, next) => {
  objectController.createObjects(req, res, next);
});

/** List and search for all objects */
routes.get('/', (req, res, next) => {
  objectController.listObjects(req, res, next);
});

/** Returns object headers */
routes.head('/:objId', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.headObject(req, res, next);
});

/** Returns the object */
routes.get('/:objId', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.readObject(req, res, next);
});

/** Updates an object */
routes.post('/:objId', currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', currentObject, hasPermission(Permissions.DELETE), async (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
routes.get('/:objId/versions', currentObject, hasPermission(Permissions.READ), async (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets an object public property */
routes.patch('/:objId/public', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  new Problem(501).send(res);
});

// TODO: Move all routes below this todo into new permissions route
/** Returns the object permissions */
routes.get('/:objId/permissions', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  new Problem(501).send(res);
});

/** Grants object permissions to a specific user */
routes.post('/:objId/permissions/:userId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  new Problem(501).send(res);
});

/** Deletes object permissions for a specific user */
routes.delete('/:objId/permissions/:userId', currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  new Problem(501).send(res);
});

module.exports = routes;
