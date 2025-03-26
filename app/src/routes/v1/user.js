const router = require('express').Router();

const { userValidator } = require('../../validators');
const { userController } = require('../../controllers');
const { checkAppMode, checkS3BasicAccess } = require('../../middleware/authorization');
const { requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Search for users */
router.get('/', checkS3BasicAccess, userValidator.searchUsers, (req, res, next) => {
  userController.searchUsers(req, res, next);
});

/** List all identity providers */
router.get('/idpList', userValidator.listIdps, (req, res, next) => {
  userController.listIdps(req, res, next);
});

module.exports = router;
