const express = require('express');
const router = express.Router();

const { Permissions } = require('../../components/constants');
const { bucketController, syncController } = require('../../controllers');
const { bucketValidator } = require('../../validators');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, hasPermission } = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Creates a bucket */
router.put('/', express.json(), bucketValidator.createBucket, (req, res, next) => {
  bucketController.createBucket(req, res, next);
});

/**
 * Returns bucket headers
 * router.head() must be declared before router.get() - otherwise router.get() will be called instead.
 * If bucketId path param is not given, router.get('/') (the bucket search endpoint) is called instead.
 */
router.head('/:bucketId', bucketValidator.headBucket, hasPermission(Permissions.READ), (req, res, next) => {
  bucketController.headBucket(req, res, next);
});

/** Returns a bucket */
router.get('/:bucketId', bucketValidator.readBucket, hasPermission(Permissions.READ), (req, res, next) => {
  bucketController.readBucket(req, res, next);
});

/** Search for buckets */
router.get('/', bucketValidator.searchBuckets, (req, res, next) => {
  bucketController.searchBuckets(req, res, next);
});

/** Updates a bucket */
router.patch('/:bucketId', express.json(), bucketValidator.updateBucket, hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketController.updateBucket(req, res, next);
  }
);

/** Deletes the bucket */
router.delete('/:bucketId', bucketValidator.deleteBucket, hasPermission(Permissions.DELETE), (req, res, next) => {
  bucketController.deleteBucket(req, res, next);
});

/** Creates a child bucket */
router.put('/:bucketId/child', express.json(), bucketValidator.createBucketChild, hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketController.createBucketChild(req, res, next);
  }
);

/** Synchronizes a bucket */
router.get('/:bucketId/sync', bucketValidator.syncBucket, hasPermission(Permissions.READ), (req, res, next) => {
  syncController.syncBucket(req, res, next);
});

module.exports = router;
