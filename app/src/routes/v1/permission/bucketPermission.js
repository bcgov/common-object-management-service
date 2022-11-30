const router = require('express').Router();

const { Permissions } = require('../../../components/constants');
const { bucketPermissionController } = require('../../../controllers');
const { bucketPermissionValidator } = require('../../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireDb);

/** Search for bucket permissions */
router.get('/', bucketPermissionValidator.searchPermissions, (req, res, next) => {
  bucketPermissionController.searchPermissions(req, res, next);
});

/** Returns the bucket permissions */
router.get('/:bucketId', requireSomeAuth, currentObject, hasPermission(Permissions.READ), bucketPermissionValidator.listPermissions, (req, res, next) => {
  bucketPermissionController.listPermissions(req, res, next);
});

/** Grants bucket permissions to users */
router.put('/:bucketId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), bucketPermissionValidator.addPermissions, (req, res, next) => {
  bucketPermissionController.addPermissions(req, res, next);
});

/** Deletes bucket permissions for a user */
router.delete('/:bucketId', requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), bucketPermissionValidator.removePermissions, (req, res, next) => {
  bucketPermissionController.removePermissions(req, res, next);
});

module.exports = router;
