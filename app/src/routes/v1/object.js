/* eslint-disable no-unused-vars */
const config = require('config');
const routes = require('express').Router();
const Problem = require('api-problem');

const dalController = require('../objectRecordData/controller');
const { controller: osController } = require('../../components/objectStorage');
const { currentUser } = require('../../components/middleware/userAccess');

if (config.has('keycloak.enabled')) {
  routes.use(currentUser);
}

/** Creates a new object */
routes.post('/', (req, res, next) => {
  osController.createObject(req, res, next);
});

/** List all user accessible objects */
routes.get('/', (req, res, next) => {
  dalController.fetchAll(req, res, next);
});

/** Returns the object */
routes.get('/:objId', (req, res, next) => {
  osController.readObject(req, res, next);
});

/** Updates an object */
routes.post('/:objId', (req, res, next) => {
  osController.updateObject(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', async (req, res, next) => {
  osController.deleteObject(req, res, next);
});

/** Returns the object version history */
routes.get('/:objId/versions', async (req, res, next) => {
  osController.listObjectVersion(req, res, next);
});

/** Sets an object public property */
routes.patch('/:objId/public', (req, res, next) => {
  new Problem(501).send(res);
});

/** Returns the object permissions */
routes.get('/:objId/permissions', (req, res, next) => {
  new Problem(501).send(res);
});

/** Grants object permissions to a specific user */
routes.post('/:objId/permissions/:userId', (req, res, next) => {
  new Problem(501).send(res);
});

/** Deletes object permissions for a specific user */
routes.delete('/:objId/permissions/:userId', (req, res, next) => {
  new Problem(501).send(res);
});

module.exports = routes;
