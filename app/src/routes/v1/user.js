const router = require('express').Router();

const { userValidator } = require('../../validators');
const { userController } = require('../../controllers');
const { checkAppMode, checkS3BasicAccess } = require('../../middleware/authorization');
const { requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Search for users */
router.get('/',
  /**
   * We currently block this user search endpoint when authenticating via S3 Access Mode
   * checkS3BasicAccess will add a bucketId query param which triggers a 422 from the userValidator
   */
  checkS3BasicAccess,
  userValidator.searchUsers, (req, res, next) => {
    userController.searchUsers(req, res, next);
  });

/** List all identity providers */
router.get('/idpList', userValidator.listIdps, (req, res, next) => {
  userController.listIdps(req, res, next);
});

module.exports = router;
