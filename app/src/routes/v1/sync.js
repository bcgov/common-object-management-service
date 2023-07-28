const router = require('express').Router();

const { syncController } = require('../../controllers');
const { syncValidator } = require('../../validators');
const { checkAppMode } = require('../../middleware/authorization');
const { requireBasicAuth, requireSomeAuth } = require('../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Synchronizes the default bucket */
router.get('/', requireBasicAuth, syncValidator.syncDefault, (req, res, next) => {
  req.params.bucketId = null;
  syncController.syncBucket(req, res, next);
});

/** Check sync queue size */
router.get('/status', (req, res, next) => {
  syncController.syncStatus(req, res, next);
});

module.exports = router;
