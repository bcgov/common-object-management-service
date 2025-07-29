const router = require('express').Router();
const helmet = require('helmet');

const { Permissions } = require('../../components/constants');
const { objectController, syncController } = require('../../controllers');
const { objectValidator } = require('../../validators');
const {
  checkAppMode,
  checkS3BasicAccess,
  currentObject,
  hasPermission,
  checkElevatedUser
} = require('../../middleware/authorization');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { currentUpload } = require('../../middleware/upload');

router.use(checkAppMode);

/** Creates new objects */
router.put('/',
  requireSomeAuth,
  objectValidator.createObject,
  checkS3BasicAccess,
  currentUpload(true),
  (req, res, next) => {
    objectController.createObject(req, res, next);
  });

/** Search for objects */
router.get('/',
  objectValidator.searchObjects,
  checkS3BasicAccess,
  (req, res, next) => {
    objectController.searchObjects(req, res, next);
  });

/** Fetch metadata for specific objects */
router.get('/metadata',
  requireSomeAuth,
  objectValidator.fetchMetadata,
  checkS3BasicAccess,
  (req, res, next) => {
    objectController.fetchMetadata(req, res, next);
  });

/** Fetch tags for specific objects */
router.get('/tagging',
  requireSomeAuth,
  objectValidator.fetchTags,
  checkS3BasicAccess,
  (req, res, next) => {
    objectController.fetchTags(req, res, next);
  });

/** Returns object headers */
router.head('/:objectId',
  objectValidator.headObject,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    objectController.headObject(req, res, next);
  }
);

/** Returns the object */
router.get('/:objectId',
  helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  objectValidator.readObject,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    // TODO: Add validation to reject unexpected query parameters
    objectController.readObject(req, res, next);
  }
);

/** Updates an object */
router.put('/:objectId',
  requireSomeAuth,
  objectValidator.updateObject,
  currentUpload(),
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.updateObject(req, res, next);
  }
);

/** Deletes the object */
router.delete('/:objectId',
  requireSomeAuth,
  objectValidator.deleteObject,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.DELETE),
  (req, res, next) => {
    objectController.deleteObject(req, res, next);
  }
);

/** Returns the object version history */
router.get('/:objectId/version',
  requireSomeAuth,
  objectValidator.listObjectVersion,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    objectController.listObjectVersion(req, res, next);
  }
);

/** creates a new version of an object using either a specified version or latest as the source */
router.put('/:objectId/version',
  requireSomeAuth,
  objectValidator.copyVersion,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.copyVersion(req, res, next);
  });

/** Sets the public flag of an object */
router.patch('/:objectId/public',
  requireSomeAuth,
  objectValidator.togglePublic,
  currentObject,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    objectController.togglePublic(req, res, next);
  }
);

/** Add metadata to an object */
router.patch('/:objectId/metadata',
  requireSomeAuth,
  objectValidator.addMetadata,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.addMetadata(req, res, next);
  }
);

/** Replace metadata on an object */
router.put('/:objectId/metadata',
  requireSomeAuth,
  objectValidator.replaceMetadata,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.replaceMetadata(req, res, next);
  }
);

/** Deletes an objects metadata */
router.delete('/:objectId/metadata',
  requireSomeAuth,
  objectValidator.deleteMetadata,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.deleteMetadata(req, res, next);
  }
);

/** Synchronizes an object */
router.get('/:objectId/sync',
  requireSomeAuth,
  objectValidator.syncObject,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    syncController.syncObject(req, res, next);
  }
);

/** Add tags to an object */
router.patch('/:objectId/tagging',
  requireSomeAuth,
  objectValidator.addTags,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.addTags(req, res, next);
  }
);

/** Add tags to an object */
router.put('/:objectId/tagging',
  requireSomeAuth,
  objectValidator.replaceTags,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.replaceTags(req, res, next);
  }
);

/** Delete tags from an object */
router.delete('/:objectId/tagging',
  requireSomeAuth,
  objectValidator.deleteTags,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.UPDATE),
  (req, res, next) => {
    objectController.deleteTags(req, res, next);
  }
);

module.exports = router;
