const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { requireDb } = require('../../middleware/featureToggle');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');

routes.use(checkAppMode);

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

/** Sets the public flag of an object */
routes.patch('/:objId/public', requireDb, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  objectController.togglePublic(req, res, next);
});

module.exports = routes;
