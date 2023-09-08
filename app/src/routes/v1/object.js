const router = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController, syncController } = require('../../controllers');
const { objectValidator } = require('../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { currentUpload } = require('../../middleware/upload');

router.use(checkAppMode);

/** Creates new objects */
router.put('/', objectValidator.createObject, requireSomeAuth, currentUpload(true), (req, res, next) => {
  objectController.createObject(req, res, next);
});

/**
 * Creates new objects
 * @deprecated
 */
router.post('/', objectValidator.createObject, requireSomeAuth, (req, res, next) => {
  objectController.createObjectPost(req, res, next);
});

/** Search for objects */
router.get('/', objectValidator.searchObjects, requireSomeAuth, (req, res, next) => {
  objectController.searchObjects(req, res, next);
});

/** Fetch metadata for specific objects */
router.get('/metadata', objectValidator.fetchMetadata, requireSomeAuth, (req, res, next) => {
  objectController.fetchMetadata(req, res, next);
});

/** Fetch tags for specific objects */
router.get('/tagging', objectValidator.fetchTags, requireSomeAuth, (req, res, next) => {
  objectController.fetchTags(req, res, next);
});

/** Returns object headers */
router.head('/:objectId', objectValidator.headObject, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.headObject(req, res, next);
});

/** Returns the object */
router.get('/:objectId', objectValidator.readObject, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.readObject(req, res, next);
});

/** Updates an object */
router.put('/:objectId', objectValidator.updateObject, requireSomeAuth, currentUpload(), currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/**
 * Updates an object
 * @deprecated
 */
router.post('/:objectId', objectValidator.updateObject, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.updateObjectPost(req, res, next);
});

/** Deletes the object */
router.delete('/:objectId', objectValidator.deleteObject, requireSomeAuth, currentObject, hasPermission(Permissions.DELETE), (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
router.get('/:objectId/version', objectValidator.listObjectVersion, requireSomeAuth, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets the public flag of an object */
router.patch('/:objectId/public', objectValidator.togglePublic, requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  objectController.togglePublic(req, res, next);
});

/** Add metadata to an object */
router.patch('/:objectId/metadata', objectValidator.addMetadata, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.addMetadata(req, res, next);
});

/** Replace metadata on an object */
router.put('/:objectId/metadata', objectValidator.replaceMetadata, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.replaceMetadata(req, res, next);
});

/** Deletes an objects metadata */
router.delete('/:objectId/metadata', objectValidator.deleteMetadata, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.deleteMetadata(req, res, next);
});

/** Synchronizes an object */
router.get('/:objectId/sync', objectValidator.syncObject, requireSomeAuth, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  syncController.syncObject(req, res, next);
});

/** Add tags to an object */
router.patch('/:objectId/tagging', objectValidator.addTags, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.addTags(req, res, next);
});

/** Add tags to an object */
router.put('/:objectId/tagging', objectValidator.replaceTags, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.replaceTags(req, res, next);
});

/** Add tags to an object */
router.delete('/:objectId/tagging', objectValidator.deleteTags, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.deleteTags(req, res, next);
});

module.exports = router;
