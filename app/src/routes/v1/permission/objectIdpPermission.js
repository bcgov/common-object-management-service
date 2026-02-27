const express = require('express');
const router = express.Router();

const { Permissions } = require('../../../components/constants');
const { objectIdpPermissionController } = require('../../../controllers');
const { objectIdpPermissionValidator } = require('../../../validators');
const {
  checkAppMode,
  currentObject,
  checkS3BasicAccess,
  hasPermission,
  checkElevatedUser,
} = require('../../../middleware/authorization');
const { requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Search for object permissions */
router.get('/',
  objectIdpPermissionValidator.searchPermissions,
  checkS3BasicAccess,
  (req, res, next) => {
    objectIdpPermissionController.searchPermissions(req, res, next);
  });

/** Returns the object permissions */
router.get('/:objectId',
  objectIdpPermissionValidator.listPermissions,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    objectIdpPermissionController.listPermissions(req, res, next);
  }
);

/** Grants object permissions to idps */
router.put('/:objectId',
  express.json(),
  objectIdpPermissionValidator.addPermissions,
  currentObject,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    objectIdpPermissionController.addPermissions(req, res, next);
  }
);

/** Deletes object permissions for a idp */
router.delete('/:objectId',
  objectIdpPermissionValidator.removePermissions,
  currentObject,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    objectIdpPermissionController.removePermissions(req, res, next);
  }
);

module.exports = router;
