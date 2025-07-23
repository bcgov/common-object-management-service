const express = require('express');
const router = express.Router();

const { Permissions } = require('../../components/constants');
const { isTruthy } = require('../../components/utils');
const { bucketController, syncController } = require('../../controllers');
const { bucketValidator } = require('../../validators');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const {
  checkAppMode,
  hasPermission,
  checkS3BasicAccess,
  checkElevatedUser
} = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Creates a bucket */
router.put('/',
  express.json(),
  bucketValidator.createBucket,
  checkS3BasicAccess,
  // checkElevatedUser,
  (req, res, next) => {
    bucketController.createBucket(req, res, next);
  });

/**
 * Returns bucket headers
 * router.head() must be declared before router.get() - otherwise router.get() will be called instead.
 * If bucketId path param is not given, router.get('/') (the bucket search endpoint) is called instead.
 */
router.head('/:bucketId',
  bucketValidator.headBucket,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    bucketController.headBucket(req, res, next);
  });

/** Returns a bucket */
router.get('/:bucketId',
  bucketValidator.readBucket,
  checkS3BasicAccess,
  hasPermission(Permissions.READ),
  (req, res, next) => {
    bucketController.readBucket(req, res, next);
  });

/** Search for buckets */
router.get('/',
  bucketValidator.searchBuckets,
  checkS3BasicAccess,
  (req, res, next) => {
    bucketController.searchBuckets(req, res, next);
  });

/** Updates a bucket */
router.patch('/:bucketId',
  express.json(),
  bucketValidator.updateBucket,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketController.updateBucket(req, res, next);
  }
);

/** Deletes the bucket */
router.delete('/:bucketId',
  bucketValidator.deleteBucket,
  checkS3BasicAccess,
  checkElevatedUser,
  hasPermission(Permissions.DELETE),
  (req, res, next) => {
    bucketController.deleteBucket(req, res, next);
  });

/**
 * Creates a child bucket
 * Note: operation requires CREATE permission on parent
 * */
router.put('/:bucketId/child',
  express.json(),
  bucketValidator.createBucketChild,
  checkS3BasicAccess,
  hasPermission(Permissions.CREATE),
  (req, res, next) => {
    bucketController.createBucketChild(req, res, next);
  }
);

/**
 * Synchronizes a bucket
 * if doing 'recursive sync', check for MANAGE permission and call syncBucketRecursive
 * else skip to next route for this path
 * ref: https://expressjs.com/en/guide/using-middleware.html
 */
router.get('/:bucketId/sync',
  bucketValidator.syncBucket,
  checkS3BasicAccess,
  (req, _res, next) => {
    if (isTruthy(req.query.recursive)) next();
    else next('route');
  },
  checkElevatedUser,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => syncController.syncBucketRecursive(req, res, next));

router.get('/:bucketId/sync',
  hasPermission(Permissions.READ),
  (req, res, next) => syncController.syncBucketSingle(req, res, next));

module.exports = router;
