const router = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { objectValidator } = require('../../validators');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, currentObject, hasPermission } = require('../../middleware/authorization');

router.use(checkAppMode);

//-----------------------------------------------------------------------------------------------------------------------------
// Routes here that are ALLOWED to be annonymousely callable in OIDC auth mode
// Must still protect permissions on the individual route/object, but the requiresSomeAuth gate won't stop them
//-----------------------------------------------------------------------------------------------------------------------------
/** Returns object headers */
router.head('/:objId', currentObject, hasPermission(Permissions.READ), objectValidator.headObject, (req, res, next) => {
  objectController.headObject(req, res, next);
});

/** Returns the object */
router.get('/:objId', currentObject, hasPermission(Permissions.READ), objectValidator.readObject, (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.readObject(req, res, next);
});
// ----------------------------------------------------------------------------------------------------------------------------

// Routes below must always obey auth mode rules
router.use(requireSomeAuth);

/** Creates new objects */
router.post('/', objectValidator.createObjects, (req, res, next) => {
  objectController.createObjects(req, res, next);
});

/** Search for objects */
router.get('/', requireDb, objectValidator.searchObjects, (req, res, next) => {
  objectController.searchObjects(req, res, next);
});

/** Fetch metadata for specific objects */
router.get('/metadata', requireDb, objectValidator.fetchMetadata, (req, res, next) => {
  objectController.fetchMetadata(req, res, next);
});

/** Search for tags */
router.get('/tagging', requireDb, objectValidator.searchTags, (req, res, next) => {
  objectController.searchTags(req, res, next);
});

/** Updates an object */
router.post('/:objId', currentObject, hasPermission(Permissions.UPDATE), objectValidator.updateObject, (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/** Deletes the object */
router.delete('/:objId', currentObject, hasPermission(Permissions.DELETE), objectValidator.deleteObject, (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
router.get('/:objId/version', currentObject, hasPermission(Permissions.READ), objectValidator.listObjectVersion, (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets the public flag of an object */
router.patch('/:objId/public', requireDb, currentObject, hasPermission(Permissions.MANAGE), objectValidator.togglePublic, (req, res, next) => {
  objectController.togglePublic(req, res, next);
});

/** Add metadata to an object */
router.patch('/:objId/metadata', currentObject, hasPermission(Permissions.UPDATE), objectValidator.addMetadata, (req, res, next) => {
  objectController.addMetadata(req, res, next);
});

/** Replace metadata on an object */
router.put('/:objId/metadata', currentObject, hasPermission(Permissions.UPDATE), objectValidator.replaceMetadata, (req, res, next) => {
  objectController.replaceMetadata(req, res, next);
});

/** Deletes an objects metadata */
router.delete('/:objId/metadata', currentObject, hasPermission(Permissions.UPDATE), objectValidator.deleteMetadata, (req, res, next) => {
  objectController.deleteMetadata(req, res, next);
});

/** Add tags to an object */
router.patch('/:objId/tagging', currentObject, hasPermission(Permissions.UPDATE), objectValidator.addTags, (req, res, next) => {
  objectController.addTags(req, res, next);
});

/** Add tags to an object */
router.put('/:objId/tagging', currentObject, hasPermission(Permissions.UPDATE), objectValidator.replaceTags, (req, res, next) => {
  objectController.replaceTags(req, res, next);
});

/** Add tags to an object */
router.delete('/:objId/tagging', currentObject, hasPermission(Permissions.UPDATE), objectValidator.deleteTags, (req, res, next) => {
  objectController.deleteTags(req, res, next);
});

module.exports = router;
