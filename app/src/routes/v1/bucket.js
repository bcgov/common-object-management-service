const routes = require('express').Router();

const { bucketController } = require('../../controllers');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode } = require('../../middleware/authorization');

routes.use(checkAppMode);
routes.use(requireDb);
routes.use(requireSomeAuth);

/** Creates a bucket */
routes.put('/', (req, res, next) => {
  bucketController.createBucket(req, res, next);
});

/** Search for buckets */
routes.get('/', (req, res, next) => {
  bucketController.searchBuckets(req, res, next);
});

/** Returns bucket headers */
routes.head('/:bucketId', (req, res, next) => {
  bucketController.headBucket(req, res, next);
});

/** Returns a bucket */
routes.get('/:bucketId', (req, res, next) => {
  bucketController.readBucket(req, res, next);
});

/** Updates a bucket */
routes.patch('/:bucketId', (req, res, next) => {
  bucketController.updateBucket(req, res, next);
});

/** Deletes the bucket */
routes.delete('/:bucketId', (req, res, next) => {
  bucketController.deleteBucket(req, res, next);
});

module.exports = routes;
