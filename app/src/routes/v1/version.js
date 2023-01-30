const router = require('express').Router();

const { versionValidator } = require('../../validators');
const { versionController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireDb);
router.use(requireSomeAuth);

/** Fetch metadata for specific version */
router.get('/metadata', versionValidator.fetchMetadata, (req, res, next) => {
  versionController.fetchMetadata(req, res, next);
});

/** Fetch tags for specific version */
router.get('/tagging', versionValidator.fetchTags, (req, res, next) => {
  versionController.fetchTags(req, res, next);
});

module.exports = router;
