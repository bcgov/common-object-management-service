const Problem = require('api-problem');
const { UniqueViolationError } = require('objection');
const { NIL: SYSTEM_USER } = require('uuid');

const { DEFAULTREGION, Permissions } = require('../components/constants');
const utils = require('../db/models/utils');
const errorToProblem = require('../components/errorToProblem');
const log = require('../components/log')(module.filename);
const {
  addDashesToUuid,
  getCurrentIdentity,
  getBucket,
  isTruthy,
  joinPath,
  mixedQueryToArray,
  stripDelimit
} = require('../components/utils');
const { redactSecrets } = require('../db/models/utils');

const { bucketService, storageService, userService } = require('../services');

const SERVICE = 'BucketService';
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
   * @function _validateCredentials
   * Guard against creating or update a bucket with invalid creds
   * @param {object} credentials The body of the request
   * @throws A conflict error problem if the bucket is not reachable
   */
  async _validateCredentials(credentials) {
    try {
      const bucketSettings = {
        accessKeyId: credentials.accessKeyId,
        bucket: credentials.bucket,
        endpoint: credentials.endpoint,
        key: credentials.key ? credentials.key : '/',
        region: credentials.region || DEFAULTREGION,
        secretAccessKey: credentials.secretAccessKey,
      };
      await storageService.headBucket(bucketSettings);
    } catch (e) {
      // If it's caught here it's unable to validate the supplied store/bucket and creds
      log.warn(`Failure to validate bucket credentials: ${e.message}`, {
        function: '_validateCredentials',
      });
      throw new Problem(409, {
        detail: 'Unable to validate supplied credentials for the bucket',
      });
    }
  },

  /**
   * @function createBucket
   * Creates a bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   * @throws The error encountered upon failure
   */
  async createBucket(req, res, next) {
    const data = {
      ...req.body,
      endpoint: stripDelimit(req.body.endpoint),
      key: req.body.key ? joinPath(stripDelimit(req.body.key)) : undefined
    };
    let response = undefined;

    try {
      // Check for credential accessibility/validity first
      await controller._validateCredentials(data);
      data.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));

      // if permCodes array (eg: ['READ', 'UPDATE'] or []) was provided use that (de-duped),
      // otherwise assign all permissions
      data.permCodes = req.body.permCodes ? Array.from(new Set(req.body.permCodes)) : Object.values(Permissions);

      response = await bucketService.create(data);
    } catch (e) {
      // If bucket exists, check if credentials precisely match
      if (e instanceof UniqueViolationError) {
        // Grant permissions if credentials precisely match
        response = await bucketService.checkGrantPermissions(data).catch(permErr => {
          next(new Problem(403, { detail: permErr.message, instance: req.originalUrl }));
        });
      } else {
        next(errorToProblem(SERVICE, e));
      }
    } finally {
      if (response) res.status(201).json(redactSecrets(response, secretFields));
    }
  },

  /**
   * @function createBucketChild
   * Creates a child bucket
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   * @throws The error encountered upon failure
   */
  async createBucketChild(req, res, next) {
    try {
      // Get Parent bucket data
      const parentBucketId = addDashesToUuid(req.params.bucketId);
      const parentBucket = await bucketService.read(parentBucketId);

      // Check new child key length
      const childKey = joinPath(stripDelimit(parentBucket.key), stripDelimit(req.body.subKey));
      if (childKey.length > 255) {
        throw new Problem(422, {
          detail: 'New derived key exceeds maximum length of 255',
          instance: req.originalUrl,
          key: childKey
        });
      }

      // Future task: give user MANAGE permission on existing sub-folder (bucket) instead (see above)
      // Check for existing bucket collision
      const bucketCollision = await bucketService.readUnique({
        bucket: parentBucket.bucket,
        endpoint: parentBucket.endpoint,
        key: childKey
      }).catch(() => undefined);

      if (bucketCollision) {
        throw new Problem(409, {
          bucketId: bucketCollision.bucketId,
          detail: 'Requested bucket already exists',
          instance: req.originalUrl,
          key: childKey
        });
      }

      // Check for credential accessibility/validity
      const childBucket = {
        bucketName: req.body.bucketName,
        accessKeyId: parentBucket.accessKeyId,
        bucket: parentBucket.bucket,
        endpoint: parentBucket.endpoint,
        key: childKey,
        secretAccessKey: parentBucket.secretAccessKey,
        region: parentBucket.region ?? undefined,
        active: parentBucket.active
      };
      await controller._validateCredentials(childBucket);
      childBucket.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));

      // assign all permissions
      childBucket.permCodes = Object.values(Permissions);

      // Create child bucket
      const response = await bucketService.create(childBucket);
      res.status(201).json(redactSecrets(response, secretFields));
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function deleteBucket
   * Deletes a bucket
   * Recursive option will delete all sub-folders (where current user has DELETE permission)
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async deleteBucket(req, res, next) {
    try {
      const bucketId = addDashesToUuid(req.params.bucketId);
      const parentBucket = await bucketService.read(bucketId);
      let buckets = [parentBucket];

      // if doing recursive delete
      if (isTruthy(req.query.recursive)) {
        // if current user is OIDC
        const userId = await userService.getCurrentUserId(
          getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
        if (userId !== SYSTEM_USER) {
          const dbChildBuckets = await bucketService.searchChildBuckets(parentBucket, true, userId);
          // if there are sub-folders
          if (dbChildBuckets.length > 0) {
            const checkForDelete = obj => obj.permCode === 'DELETE';
            const dbChildBucketsWithDelete = dbChildBuckets.filter(b =>
              b.bucketPermission.some(checkForDelete));
            // if user has DELETE on all subfolders
            if (dbChildBucketsWithDelete.length === dbChildBuckets.length) {
              buckets = buckets.concat(dbChildBucketsWithDelete);
            } else {
              throw new Problem(403, {
                detail: 'User lacks DELETE permission for some sub-folders',
                instance: req.originalUrl,
              });
            }
          }
        }
        // else basic auth
        else {
          const dbChildBuckets = await bucketService.searchChildBuckets(parentBucket);
          buckets = buckets.concat(dbChildBuckets);
        }
      }
      // do delete
      await utils.trxWrapper(async (trx) => {
        return await Promise.all(
          buckets.map(bucket => bucketService.delete(bucket.bucketId, trx))
        );
      });
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
      await storageService.headBucket({ bucketId });

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
   * @function togglePublic
   * Sets the public flag of a bucket (or folder)
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async togglePublic(req, res, next) {
    try {
      const bucketId = addDashesToUuid(req.params.bucketId);
      const publicFlag = isTruthy(req.query.public) ?? false;
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      const bucket = await getBucket(bucketId);
      const data = {
        bucketId: bucketId,
        path: bucket.key + '/',
        public: publicFlag,
        userId: userId
      };
      await storageService.updatePublic(data).catch(() => {
        log.warn('Failed to apply permission changes to S3', { function: 'togglePublic', ...data });
      });
      // const s3Public = await storageService.getPublic({ path: data.path, bucketId: bucketId });
      // console.log('s3Public', s3Public);

      const response = await bucketService.updatePublic({
        ...bucket,
        bucketId: bucketId,
        public: publicFlag,
        userId: userId
      });

      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
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
      const bucketId = addDashesToUuid(req.params.bucketId);
      const currentBucket = await bucketService.read(bucketId);

      // Check for credential accessibility/validity first
      // Need to cross reference with existing data when partial patch data is provided
      await controller._validateCredentials({
        ...currentBucket,
        ...req.body,
        endpoint: req.body.endpoint ? stripDelimit(req.body.endpoint) : currentBucket.endpoint
      });

      let userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      if ((userId === SYSTEM_USER || userId === undefined) && req.currentUser?.bucketSettings) {
        userId = req.currentUser.bucketSettings.accessKeyId;
      }

      const response = await bucketService.update({
        bucketId: bucketId,
        bucketName: req.body.bucketName,
        accessKeyId: req.body.accessKeyId,
        bucket: req.body.bucket,
        endpoint: req.body.endpoint ? stripDelimit(req.body.endpoint) : undefined,
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
