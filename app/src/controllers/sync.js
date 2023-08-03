const { NIL: SYSTEM_USER } = require('uuid');

const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getCurrentIdentity, isTruthy } = require('../components/utils');
const { objectService, storageService, objectQueueService, userService } = require('../services');

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
      const allMode = isTruthy(req.query.all);
      const bucketId = addDashesToUuid(req.params.bucketId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      const dbParams = {};
      if (!allMode) dbParams.bucketId = bucketId;

      const [dbResponse, s3Response] = await Promise.all([
        objectService.searchObjects(dbParams),
        storageService.listAllObjectVersions({ bucketId: bucketId, filterLatest: true })
      ]);

      // Aggregate and dedupe all file paths to consider
      const jobs = [...new Set([
        ...dbResponse.map(object => object.path),
        ...s3Response.DeleteMarkers.map(object => object.Key),
        ...s3Response.Versions.map(object => object.Key)
      ])].map(path => ({ path: path, bucketId: bucketId }));
      console.log('jobs', jobs);

      const response = await objectQueueService.enqueue({ jobs: jobs, full: isTruthy(req.query.full), createdBy: userId });
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
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      const response = await objectQueueService.enqueue({
        jobs: [{ path: path, bucketId: bucketId }],
        full: isTruthy(req.query.full),
        createdBy: userId
      });
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
