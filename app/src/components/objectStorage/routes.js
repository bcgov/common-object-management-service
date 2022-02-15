/* eslint-disable no-unused-vars */
const config = require('config');
const routes = require('express').Router();
const Problem = require('api-problem');

const { Permissions } = require('../constants');
const { objectController, recordController, storageController } = require('../../controllers');
const { currentUser } = require('../../middleware/authentication');
const { currentObjectRecord, hasPermission } = require('../../middleware/authorization');

if (config.has('keycloak.enabled')) {
  routes.use(currentUser);
}

/** Creates a new object */
routes.post('/', (req, res, next) => {
  storageController.createObject(req, res, next);
  // mocking this for testing
  req.objectStorageData = {
    originalName: 'from file access above.txt',
    mimeType: 'txt',
    path: 'response from s3 stuff'
  };
  recordController.create(req, res, next);
  // How to put these 2 results together if 2 controllers?
});

/** List all user accessible objects */
routes.get('/', (req, res, next) => {
  recordController.fetchAll(req, res, next);
});

/** Returns the object */
routes.get('/:objId', currentObjectRecord, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.readObject(req, res, next);
  recordController.read(req, res, next);
  // How to put these 2 results together if 2 controllers?
});

/** Updates an object */
routes.post('/:objId', currentObjectRecord, hasPermission(Permissions.UPDATE), (req, res, next) => {
  storageController.updateObject(req, res, next);
  // This needs implementing
  // dalController.updateVersion(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', currentObjectRecord, hasPermission(Permissions.DELETE), (req, res, next) => {
  storageController.deleteObject(req, res, next);
  recordController.create(req, res, next);
  // How to put these 2 results together if 2 controllers?
});

/** Returns the object version history */
routes.get('/:objId/versions', currentObjectRecord, hasPermission(Permissions.READ), (req, res, next) => {
  storageController.listObjectVersion(req, res, next);
});

/** Sets an object public property */
routes.patch('/:objId/public', currentObjectRecord, hasPermission(Permissions.MANAGE), (req, res, next) => {
  new Problem(501).send(res);
});

/** Returns the object permissions */
routes.get('/:objId/permissions', currentObjectRecord, hasPermission(Permissions.READ), (req, res, next) => {
  new Problem(501).send(res);
});

/** Grants object permissions to a specific user */
routes.post('/:objId/permissions/:userId', currentObjectRecord, hasPermission(Permissions.MANAGE), (req, res, next) => {
  new Problem(501).send(res);
});

/** Deletes object permissions for a specific user */
routes.delete('/:objId/permissions/:userId', currentObjectRecord, hasPermission(Permissions.MANAGE), (req, res, next) => {
  new Problem(501).send(res);
});

module.exports = routes;
