const router = require('express').Router();

const { versionValidator } = require('../../validators');
const { versionController } = require('../../controllers');
const { checkAppMode, checkS3BasicAccess } = require('../../middleware/authorization');
const { requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);
router.use(checkS3BasicAccess);

/** Fetch metadata for specific version */
router.get('/metadata', versionValidator.fetchMetadata, (req, res, next) => {
  versionController.fetchMetadata(req, res, next);
});

/** Fetch tags for specific version */
router.get('/tagging', versionValidator.fetchTags, (req, res, next) => {
  versionController.fetchTags(req, res, next);
});

module.exports = router;
