const express = require('express');
const router = express.Router();

const { Permissions } = require('../../components/constants');
const { isTruthy } = require('../../components/utils');
const { bucketController, syncController } = require('../../controllers');
const { bucketValidator } = require('../../validators');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, hasPermission, checkS3BasicAccess } = require('../../middleware/authorization');

router.use(checkAppMode);

/** Creates a bucket */
router.put('/',
  requireSomeAuth,
  express.json(),
  bucketValidator.createBucket,
  checkS3BasicAccess,
  (req, res, next) => {
    bucketController.createBucket(req, res, next);
  });

/**
 * Returns bucket headers
 * router.head() must be declared before router.get() - otherwise router.get() will be called instead.
 * If bucketId path param is not given, router.get('/') (the bucket search endpoint) is called instead.
 */
router.head('/:bucketId',
  requireSomeAuth,
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
  requireSomeAuth,
  bucketValidator.searchBuckets,
  checkS3BasicAccess,
  (req, res, next) => {
    bucketController.searchBuckets(req, res, next);
  });

/** Updates a bucket */
router.patch('/:bucketId',
  requireSomeAuth,
  express.json(),
  bucketValidator.updateBucket,
  checkS3BasicAccess,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketController.updateBucket(req, res, next);
  }
);

/** Sets the public flag of a bucket (or folder) */
router.patch('/:bucketId/public',
  requireSomeAuth,
  bucketValidator.togglePublic,
  hasPermission(Permissions.MANAGE),
  (req, res, next) => {
    bucketController.togglePublic(req, res, next);
  }
);

/** Deletes the bucket */
router.delete('/:bucketId',
  requireSomeAuth,
  bucketValidator.deleteBucket,
  checkS3BasicAccess,
  hasPermission(Permissions.DELETE),
  (req, res, next) => {
    bucketController.deleteBucket(req, res, next);
  });

/** Creates a child bucket */
router.put('/:bucketId/child',
  requireSomeAuth,
  express.json(),
  bucketValidator.createBucketChild,
  checkS3BasicAccess,
  hasPermission(Permissions.MANAGE),
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
  requireSomeAuth,
  bucketValidator.syncBucket,
  checkS3BasicAccess,
  (req, _res, next) => {
    if (isTruthy(req.query.recursive)) next();
    else next('route');
  },
  hasPermission(Permissions.MANAGE),
  (req, res, next) => syncController.syncBucketRecursive(req, res, next));

router.get('/:bucketId/sync',
  hasPermission(Permissions.READ),
  (req, res, next) => syncController.syncBucketSingle(req, res, next));

module.exports = router;
