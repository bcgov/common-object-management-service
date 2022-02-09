/* eslint-disable no-unused-vars */
const config = require('config');
const routes = require('express').Router();
const Problem = require('api-problem');

const { Permissions } = require('../constants');
const controller = require('./controller');
const dalController = require('../objectRecordData/controller');
const { currentUser } = require('../middleware/userAccess');
const { currentObjectRecord, hasPermission } = require('../middleware/permissions');

if (config.has('keycloak.enabled')) {
  routes.use(currentUser);
}

/** Creates a new object */
routes.post('/', (req, res, next) => {
  controller.createObject(req, res, next);
  // mocking this for testing
  req.objectStorageData = {
    originalName: 'from file access above.txt',
    mimeType: 'txt',
    path: 'response from s3 stuff'
  };
  dalController.create(req, res, next);
  // How to put these 2 results together if 2 controllers?
});

/** List all user accessible objects */
routes.get('/', (req, res, next) => {
  dalController.fetchAll(req, res, next);
});

/** Returns the object */
routes.get('/:objId', currentObjectRecord, hasPermission(Permissions.READ), (req, res, next) => {
  controller.readObject(req, res, next);
  dalController.read(req, res, next);
  // How to put these 2 results together if 2 controllers?
});

/** Updates an object */
routes.post('/:objId', currentObjectRecord, hasPermission(Permissions.UPDATE), (req, res, next) => {
  controller.updateObject(req, res, next);
  // This needs implementing
  // dalController.updateVersion(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', currentObjectRecord, hasPermission(Permissions.DELETE), (req, res, next) => {
  controller.deleteObject(req, res, next);
  dalController.create(req, res, next);
  // How to put these 2 results together if 2 controllers?
});

/** Returns the object version history */
routes.get('/:objId/versions', currentObjectRecord, hasPermission(Permissions.READ), (req, res, next) => {
  controller.listObjectVersion(req, res, next);
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
