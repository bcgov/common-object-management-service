const router = require('express').Router();

const { metadataController } = require('../../controllers');
const { metadataValidator } = require('../../validators');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode } = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Search for metadata */
router.get('/', metadataValidator.searchMetadata, (req, res, next) => {
  metadataController.searchMetadata(req, res, next);
});

module.exports = router;
