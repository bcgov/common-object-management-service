const router = require('express').Router();

const { bucketController } = require('../../controllers');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode } = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireDb);
router.use(requireSomeAuth);

/** Creates a bucket */
router.put('/', (req, res, next) => {
  bucketController.createBucket(req, res, next);
});

/** Search for buckets */
router.get('/', (req, res, next) => {
  bucketController.searchBuckets(req, res, next);
});

/** Returns bucket headers */
router.head('/:bucketId', (req, res, next) => {
  bucketController.headBucket(req, res, next);
});

/** Returns a bucket */
router.get('/:bucketId', (req, res, next) => {
  bucketController.readBucket(req, res, next);
});

/** Updates a bucket */
router.patch('/:bucketId', (req, res, next) => {
  bucketController.updateBucket(req, res, next);
});

/** Deletes the bucket */
router.delete('/:bucketId', (req, res, next) => {
  bucketController.deleteBucket(req, res, next);
});

module.exports = router;
