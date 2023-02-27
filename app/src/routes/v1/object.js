const router = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { objectValidator } = require('../../validators');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');

router.use(checkAppMode);

/** Creates new objects */
router.post('/', objectValidator.createObjects, requireSomeAuth, (req, res, next) => {
  objectController.createObjects(req, res, next);
});

/** Search for objects */
router.get('/', objectValidator.searchObjects, requireSomeAuth, requireDb, (req, res, next) => {
  objectController.searchObjects(req, res, next);
});

/** Fetch metadata for specific objects */
router.get('/metadata', objectValidator.fetchMetadata, requireSomeAuth, requireDb, (req, res, next) => {
  objectController.fetchMetadata(req, res, next);
});

/** Fetch tags for specific objects */
router.get('/tagging', objectValidator.fetchTags, requireSomeAuth, requireDb, (req, res, next) => {
  objectController.fetchTags(req, res, next);
});

/** Returns object headers */
router.head('/:objId', objectValidator.headObject, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.headObject(req, res, next);
});

/** Returns the object */
router.get('/:objId', objectValidator.readObject, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.readObject(req, res, next);
});

/** Updates an object */
router.post('/:objId', objectValidator.updateObject, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/** Deletes the object */
router.delete('/:objId', objectValidator.deleteObject, requireSomeAuth, currentObject, hasPermission(Permissions.DELETE), (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
router.get('/:objId/version', objectValidator.listObjectVersion, requireSomeAuth, requireDb, currentObject, hasPermission(Permissions.READ), (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets the public flag of an object */
router.patch('/:objId/public', objectValidator.togglePublic, requireSomeAuth, requireDb, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  objectController.togglePublic(req, res, next);
});

/** Add metadata to an object */
router.patch('/:objId/metadata', objectValidator.addMetadata, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.addMetadata(req, res, next);
});

/** Replace metadata on an object */
router.put('/:objId/metadata', objectValidator.replaceMetadata, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.replaceMetadata(req, res, next);
});

/** Deletes an objects metadata */
router.delete('/:objId/metadata', objectValidator.deleteMetadata, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.deleteMetadata(req, res, next);
});

/** Add tags to an object */
router.patch('/:objId/tagging', objectValidator.addTags, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.addTags(req, res, next);
});

/** Add tags to an object */
router.put('/:objId/tagging', objectValidator.replaceTags, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.replaceTags(req, res, next);
});

/** Add tags to an object */
router.delete('/:objId/tagging', objectValidator.deleteTags, requireSomeAuth, currentObject, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.deleteTags(req, res, next);
});

module.exports = router;
