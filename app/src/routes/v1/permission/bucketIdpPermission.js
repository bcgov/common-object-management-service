const express = require('express');
const router = express.Router();

const { Permissions } = require('../../../components/constants');
const { bucketIdpPermissionController } = require('../../../controllers');
const { bucketIdpPermissionValidator } = require('../../../validators');
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

/** Search for bucket permissions */
router.get('/',
  bucketIdpPermissionValidator.searchPermissions,
  checkS3BasicAccess,
  (req, res, next) => {
    bucketIdpPermissionController.searchPermissions(req, res, next);
  });

/** Returns the bucket permissions */
router.get('/:bucketId',
  bucketIdpPermissionValidator.listPermissions,
  currentObject,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    bucketIdpPermissionController.listPermissions(req, res, next);
  }
);

/** Grants bucket permissions to idps */
router.put('/:bucketId',
  express.json(),
  bucketIdpPermissionValidator.addPermissions,
  currentObject,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketIdpPermissionController.addPermissions(req, res, next);
  }
);

/** Deletes bucket permissions for a idp */
router.delete('/:bucketId',
  bucketIdpPermissionValidator.removePermissions,
  currentObject,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketIdpPermissionController.removePermissions(req, res, next);
  }
);

module.exports = router;
