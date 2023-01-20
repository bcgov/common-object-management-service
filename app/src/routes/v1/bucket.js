const router = require('express').Router();

const { Permissions } = require('../../components/constants');
const { bucketController } = require('../../controllers');
const { bucketValidator } = require('../../validators');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, hasPermission } = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireDb);
router.use(requireSomeAuth);

/** Creates a bucket */
router.put('/', bucketValidator.createBucket, (req, res, next) => {
  bucketController.createBucket(req, res, next);
});

/** Search for buckets */
router.get('/', bucketValidator.searchBuckets, (req, res, next) => {
  bucketController.searchBuckets(req, res, next);
});

/** Returns bucket headers */
router.head('/:bucketId', bucketValidator.headBucket, hasPermission(Permissions.READ), (req, res, next) => {
  bucketController.headBucket(req, res, next);
});

/** Returns a bucket */
router.get('/:bucketId', bucketValidator.readBucket, hasPermission(Permissions.READ), (req, res, next) => {
  bucketController.readBucket(req, res, next);
});

/** Updates a bucket */
router.patch('/:bucketId', bucketValidator.updateBucket, hasPermission(Permissions.UPDATE), (req, res, next) => {
  bucketController.updateBucket(req, res, next);
});

/** Deletes the bucket */
router.delete('/:bucketId', bucketValidator.deleteBucket, hasPermission(Permissions.DELETE), (req, res, next) => {
  bucketController.deleteBucket(req, res, next);
});

module.exports = router;
