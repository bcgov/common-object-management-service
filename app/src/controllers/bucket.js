const Problem = require('api-problem');
const { UniqueViolationError } = require('objection');
const { NIL: SYSTEM_USER } = require('uuid');

const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  isTruthy,
  mixedQueryToArray,
  getCurrentIdentity
} = require('../components/utils');
const { redactSecrets } = require('../db/models/utils');

const { bucketService, storageService, userService } = require('../services');

const SERVICE = 'ObjectService';
const secretFields = ['accessKeyId', 'secretAccessKey'];

/**
 * The Bucket Controller
 */
const controller = {
  /**
   * @function _processS3Headers
   * Accepts a typical S3 response object and inserts appropriate express response headers
   * Returns an array of non-standard headers that need to be CORS exposed
   * @param {object} s3Resp S3 response object
   * @param {object} res Express response object
   * @returns {string[]} An array of non-standard headers that need to be CORS exposed
   */
  _processS3Headers(s3Resp, res) {
    // TODO: Consider adding 'x-coms-public' and 'x-coms-path' headers into API spec?
    const exposedHeaders = [];

    if (s3Resp.ContentLength) res.set('Content-Length', s3Resp.ContentLength);
    if (s3Resp.ContentType) res.set('Content-Type', s3Resp.ContentType);
    if (s3Resp.ETag) {
      const etag = 'ETag';
      res.set(etag, s3Resp.ETag);
      exposedHeaders.push(etag);
    }
    if (s3Resp.LastModified) res.set('Last-Modified', s3Resp.LastModified);
    if (s3Resp.Metadata) {
      Object.entries(s3Resp.Metadata).forEach(([key, value]) => {
        const metadata = `x-amz-meta-${key}`;
        res.set(metadata, value);
        exposedHeaders.push(metadata);
      });

      if (s3Resp.Metadata.name) res.attachment(s3Resp.Metadata.name);
    }
    if (s3Resp.ServerSideEncryption) {
      const sse = 'x-amz-server-side-encryption';
      res.set(sse, s3Resp.ServerSideEncryption);
      exposedHeaders.push(sse);
    }
    if (s3Resp.VersionId) {
      const s3VersionId = 'x-amz-version-id';
      res.set(s3VersionId, s3Resp.VersionId);
      exposedHeaders.push(s3VersionId);
    }

    return exposedHeaders;
  },

  /**
   * @function createBucket
   * Creates a bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async createBucket(req, res, next) {
    const data = { ...req.body };
    let response = undefined;
    try {
      // TODO: Check for credential accessibility/validity first via headBucket
      data.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      response = await bucketService.create(data);
    } catch (e) {
      // If bucket exists, check if credentials precisely match
      if (e instanceof UniqueViolationError) {
        // Grant all permissions if credentials precisely match
        response = await bucketService.checkGrantPermissions(data).catch(permErr => {
          throw new Problem(403, { details: permErr.message }).send(res);
        });
      } else {
        next(errorToProblem(SERVICE, e));
      }
    } finally {
      if (response) res.status(201).json(redactSecrets(response, secretFields));
    }
  },

  /**
   * @function deleteBucket
   * Deletes the bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async deleteBucket(req, res, next) {
    try {
      const bucketId = addDashesToUuid(req.params.bucketId);
      await bucketService.delete(bucketId);
      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function headBucket
   * Returns bucket headers
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async headBucket(req, res, next) {
    try {
      const bucketId = addDashesToUuid(req.params.bucketId);
      await storageService.headBucket(bucketId);

      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function readBucket
   * Returns a bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async readBucket(req, res, next) {
    try {
      const bucketId = addDashesToUuid(req.params.bucketId);
      const response = await bucketService.read(bucketId);
      res.status(200).json(redactSecrets(response, secretFields));
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function searchBuckets
   * Search and filter for specific buckets
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchBuckets(req, res, next) {
    try {
      const bucketIds = mixedQueryToArray(req.query.bucketId);
      const params = {
        bucketId: bucketIds ? bucketIds.map(id => addDashesToUuid(id)) : bucketIds,
        bucketName: req.query.bucketName,
        key: req.query.key,
        active: isTruthy(req.query.active)
      };

      const response = await bucketService.searchBuckets(params);
      res.status(200).json(response.map(bucket => redactSecrets(bucket, secretFields)));
    } catch (error) {
      next(error);
    }
  },

  /**
   * @function updateBucket
   * Updates a bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async updateBucket(req, res, next) {
    try {
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
      const response = await bucketService.update({
        bucketId: req.params.bucketId,
        bucketName: req.body.bucketName,
        accessKeyId: req.body.accessKeyId,
        bucket: req.body.bucket,
        endpoint: req.body.endpoint,
        key: req.body.key,
        secretAccessKey: req.body.secretAccessKey,
        region: req.body.region,
        active: isTruthy(req.body.active),
        userId: userId
      });

      res.status(200).json(redactSecrets(response, secretFields));
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
