const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid } = require('../components/utils');
const { objectService, storageService, objectQueueService } = require('../services');

const SERVICE = 'ObjectQueueService';

/**
 * The Sync Controller
 */
const controller = {
  /**
   * @function syncBucket
   * Synchronizes a bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async syncBucket(req, res, next) {
    try {
      // TODO: Consider adding an "all" mode for checking through all known objects and buckets for job enumeration
      // const allMode = isTruthy(req.query.all);
      const bucketId = addDashesToUuid(req.params.bucketId);

      const [dbResponse, s3Response] = await Promise.all([
        objectService.searchObjects({ bucketId: bucketId }),
        storageService.listAllObjectVersions({ bucketId: bucketId, filterLatest: true })
      ]);

      // Aggregate and dedupe all file paths to consider
      const jobs = [...new Set([
        ...dbResponse.map(object => object.path),
        ...s3Response.DeleteMarkers.map(object => object.Key),
        ...s3Response.Versions.map(object => object.Key)
      ])].map(path => ({ path: path, bucketId: bucketId }));

      const response = await objectQueueService.enqueue({ jobs: jobs });
      res.status(202).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function syncObject
   * Synchronizes an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async syncObject(req, res, next) {
    try {
      const bucketId = req.currentObject?.bucketId;
      const path = req.currentObject?.path;

      const response = await objectQueueService.enqueue({ jobs: [{ path: path, bucketId: bucketId }] });
      res.status(202).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function syncStatus
   * Reports on current sync queue size
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async syncStatus(_req, res, next) {
    try {
      const response = await objectQueueService.queueSize();
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
