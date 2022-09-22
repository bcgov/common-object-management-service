const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { objectValidator } = require('../../validators');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');

routes.use(checkAppMode);
routes.use(requireSomeAuth);

/** Creates new objects */
routes.post('/', objectValidator.createObjects, (req, res, next) => {
  objectController.createObjects(req, res, next);
});

/** Search for objects */
routes.get('/', requireDb, objectValidator.searchObjects, (req, res, next) => {
  objectController.searchObjects(req, res, next);
});

/** Search for tags */
routes.get('/metadata', requireDb, objectValidator.searchMetadata, (req, res, next) => {
  objectController.searchMetadata(req, res, next);
});

/** Search for tags */
routes.get('/tagging', requireDb, objectValidator.searchTags, (req, res, next) => {
  objectController.searchTags(req, res, next);
});

/** Returns object headers */
routes.head('/:objId', currentObject, hasPermission(Permissions.READ), objectValidator.headObject, (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.headObject(req, res, next);
});

/** Returns the object */
routes.get('/:objId', currentObject, hasPermission(Permissions.READ), objectValidator.readObject, (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.readObject(req, res, next);
});

/** Updates an object */
routes.post('/:objId', currentObject, hasPermission(Permissions.UPDATE), objectValidator.updateObject, (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId', currentObject, hasPermission(Permissions.DELETE), objectValidator.deleteObject, (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
routes.get('/:objId/version', currentObject, hasPermission(Permissions.READ), objectValidator.listObjectVersion, (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets the public flag of an object */
routes.patch('/:objId/public', requireDb, currentObject, hasPermission(Permissions.MANAGE), objectValidator.togglePublic, (req, res, next) => {
  objectController.togglePublic(req, res, next);
});

/** Add metadata to an object */
routes.patch('/:objId/metadata', currentObject, hasPermission(Permissions.UPDATE), objectValidator.addMetadata, (req, res, next) => {
  objectController.addMetadata(req, res, next);
});

/** Replace metadata on an object */
routes.put('/:objId/metadata', currentObject, hasPermission(Permissions.UPDATE), objectValidator.replaceMetadata, (req, res, next) => {
  objectController.replaceMetadata(req, res, next);
});

/** Deletes an objects metadata */
routes.delete('/:objId/metadata', currentObject, hasPermission(Permissions.UPDATE), objectValidator.deleteMetadata, (req, res, next) => {
  objectController.deleteMetadata(req, res, next);
});

/** Add tags to an object */
routes.patch('/:objId/tagging', currentObject, hasPermission(Permissions.UPDATE), objectValidator.addTags, (req, res, next) => {
  objectController.addTags(req, res, next);
});

/** Add tags to an object */
routes.put('/:objId/tagging', currentObject, hasPermission(Permissions.UPDATE), objectValidator.replaceTags, (req, res, next) => {
  objectController.replaceTags(req, res, next);
});

/** Add tags to an object */
routes.delete('/:objId/tagging', currentObject, hasPermission(Permissions.UPDATE), objectValidator.deleteTags, (req, res, next) => {
  objectController.deleteTags(req, res, next);
});

module.exports = routes;
