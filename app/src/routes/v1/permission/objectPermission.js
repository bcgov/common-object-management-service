const express = require('express');
const router = express.Router();

const { Permissions } = require('../../../components/constants');
const { objectPermissionController } = require('../../../controllers');
const { objectPermissionValidator } = require('../../../validators');
const { checkAppMode, currentObject, checkS3BasicAccess, hasPermission } = require('../../../middleware/authorization');
const { requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);
router.use(checkS3BasicAccess);

/** Search for object permissions */
router.get('/', objectPermissionValidator.searchPermissions, (req, res, next) => {
  objectPermissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
router.get('/:objectId', objectPermissionValidator.listPermissions, currentObject, hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    objectPermissionController.listPermissions(req, res, next);
  }
);

/** Grants object permissions to users */
router.put('/:objectId', express.json(), objectPermissionValidator.addPermissions,
  currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
    objectPermissionController.addPermissions(req, res, next);
  }
);

/** Deletes object permissions for a user */
router.delete('/:objectId', objectPermissionValidator.removePermissions,
  currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
    objectPermissionController.removePermissions(req, res, next);
  }
);

module.exports = router;
