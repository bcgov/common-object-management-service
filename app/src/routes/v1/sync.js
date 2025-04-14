const router = require('express').Router();

const { syncController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireBasicAuth, requireSomeAuth } = require('../../middleware/featureToggle');
const { syncValidator } = require('../../validators');


router.use(checkAppMode);
router.use(requireSomeAuth);

/** Synchronizes the default bucket */
router.get('/', requireBasicAuth, (req, res, next) => {
  req.params.bucketId = null;
  syncController.syncBucketRecursive(req, res, next);
});

/** Check sync queue size */
router.get('/status',
  syncValidator.syncStatus, (req, res, next) => {
    syncController.syncStatus(req, res, next);
  });

module.exports = router;
