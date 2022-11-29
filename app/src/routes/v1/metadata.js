const router = require('express').Router();

const { metadataController } = require('../../controllers');
const { metadataValidator } = require('../../validators');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode } = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireSomeAuth);
router.use(requireDb);

/** Search for metadata */
router.get('/', metadataValidator.searchMetadata, (req, res, next) => {
  metadataController.searchMetadata(req, res, next);
});

module.exports = router;
