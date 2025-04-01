const router = require('express').Router();

const { versionValidator } = require('../../validators');
const { versionController } = require('../../controllers');
const { checkAppMode, checkS3BasicAccess } = require('../../middleware/authorization');
const { requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Fetch metadata for specific version */
router.get('/metadata',
  versionValidator.fetchMetadata,
  checkS3BasicAccess,
  (req, res, next) => {
    versionController.fetchMetadata(req, res, next);
  });

/** Fetch tags for specific version */
router.get('/tagging',
  versionValidator.fetchTags,
  checkS3BasicAccess,
  (req, res, next) => {
    versionController.fetchTags(req, res, next);
  });

module.exports = router;
