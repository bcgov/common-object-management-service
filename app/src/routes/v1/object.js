const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { objectValidator } = require('../../validators');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');

routes.use(checkAppMode);

/** Creates new objects */
routes.post('/', requireSomeAuth, (req, res, next) => {
  objectController.createObjects(req, res, next);
});

/** Search for objects */
routes.get('/', requireDb, requireSomeAuth, objectValidator.searchObjects, (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.searchObjects(req, res, next);
});

/** Returns object headers */
routes.head('/:objId', objectValidator.headObject, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.headObject(req, res, next);
});

/** Returns the object */
routes.get('/:objId', objectValidator.readObject, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.readObject(req, res, next);
});

/** Updates an object */
routes.post('/:objId', currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', objectValidator.deleteObject, currentObject, hasPermission(Permissions.DELETE), async (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
routes.get('/:objId/versions', objectValidator.listObjectVersion, currentObject, hasPermission(Permissions.READ), async (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets the public flag of an object */
routes.patch('/:objId/public', objectValidator.togglePublic, requireDb, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.togglePublic(req, res, next);
});

/** Add metadata to an object */
routes.patch('/:objId/metadata', currentObject, requireSomeAuth, (req, res, next) => {
  objectController.addMetadata(req, res, next);
});

/** Replace metadata on an object */
routes.put('/:objId/metadata', currentObject, requireSomeAuth, (req, res, next) => {
  objectController.replaceMetadata(req, res, next);
});

/** Deletes an objects metadata */
routes.delete('/:objId/metadata', currentObject, requireSomeAuth, (req, res, next) => {
  objectController.deleteMetadata(req, res, next);
});

module.exports = routes;
