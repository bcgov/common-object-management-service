const router = require('express').Router();

const { userValidator } = require('../../validators');
const { userController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireDb);
router.use(requireSomeAuth);

/** Search for users */
router.get('/', userValidator.searchUsers, (req, res, next) => {
  userController.searchUsers(req, res, next);
});

/** List all identity providers */
router.get('/idpList', userValidator.listIdps, (req, res, next) => {
  userController.listIdps(req, res, next);
});

module.exports = router;
