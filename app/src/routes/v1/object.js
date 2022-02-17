/* eslint-disable no-unused-vars */
const config = require('config');
const routes = require('express').Router();
const Problem = require('api-problem');

const { Permissions } = require('../../components/constants');
const { objectController, recordController, storageController } = require('../../controllers');
const { currentUser } = require('../../middleware/authentication');
const { currentObject, hasPermission } = require('../../middleware/authorization');

routes.use(currentUser);

/** Creates a new object */
routes.post('/', (req, res, next) => {
  objectController.createObject(req, res, next);
});

/** List all user accessible objects */
routes.get('/', (req, res, next) => {
  recordController.fetchAll(req, res, next);
});

/** Returns the object */
routes.get('/:objId', currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.readObject(req, res, next);
});

/** Updates an object */
routes.post('/:objId', currentObject, (req, res, next) => {
  storageController.updateObject(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', currentObject, async (req, res, next) => {
  storageController.deleteObject(req, res, next);
});

/** Returns the object version history */
routes.get('/:objId/versions', currentObject, async (req, res, next) => {
  storageController.listObjectVersion(req, res, next);
});

/** Sets an object public property */
routes.patch('/:objId/public', currentObject, (req, res, next) => {
  new Problem(501).send(res);
});

/** Returns the object permissions */
routes.get('/:objId/permissions', currentObject, (req, res, next) => {
  new Problem(501).send(res);
});

/** Grants object permissions to a specific user */
routes.post('/:objId/permissions/:userId', currentObject, (req, res, next) => {
  new Problem(501).send(res);
});

/** Deletes object permissions for a specific user */
routes.delete('/:objId/permissions/:userId', currentObject, (req, res, next) => {
  new Problem(501).send(res);
});

module.exports = routes;
