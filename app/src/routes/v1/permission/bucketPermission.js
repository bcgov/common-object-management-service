const router = require('express').Router();

const { Permissions } = require('../../../components/constants');
const { bucketPermissionController } = require('../../../controllers');
const { bucketPermissionValidator } = require('../../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireDb);
router.use(requireSomeAuth);

/** Search for bucket permissions */
router.get('/', bucketPermissionValidator.searchPermissions, (req, res, next) => {
  bucketPermissionController.searchPermissions(req, res, next);
});

/** Returns the bucket permissions */
router.get('/:bucketId', bucketPermissionValidator.listPermissions, currentObject, hasPermission(Permissions.READ),  (req, res, next) => {
  bucketPermissionController.listPermissions(req, res, next);
});

/** Grants bucket permissions to users */
router.put('/:bucketId', bucketPermissionValidator.addPermissions, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  bucketPermissionController.addPermissions(req, res, next);
});

/** Deletes bucket permissions for a user */
router.delete('/:bucketId', bucketPermissionValidator.removePermissions, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  bucketPermissionController.removePermissions(req, res, next);
});

module.exports = router;
