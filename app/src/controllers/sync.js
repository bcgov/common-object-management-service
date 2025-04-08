const { NIL: SYSTEM_USER } = require('uuid');

const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getCurrentIdentity, formatS3KeyForCompare, isPrefixOfPath } = require('../components/utils');
const utils = require('../db/models/utils');
const log = require('../components/log')(module.filename);

const {
  bucketPermissionService,
  bucketService,
  objectService,
  storageService,
  objectQueueService,
  userService
} = require('../services');

const SERVICE = 'ObjectQueueService';

/**
 * The Sync Controller
 */
const controller = {

  /**
   * @function syncBucketRecursive
   * Synchronizes all objects and subfolders found at the Key and below for the given parent folder (bucket)
   * NOTE: OIDC users reuire MANAGE permission to do a recursive sync on a folder
   * All their permissions will be copied to any NEW sub-folders created
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async syncBucketRecursive(req, res, next) {
    try {
      // current userId
      const userId = await userService.getCurrentUserId(
        getCurrentIdentity(req.currentUser, SYSTEM_USER),
        SYSTEM_USER
      );
      // parent bucket
      const bucketId = addDashesToUuid(req.params.bucketId);
      const parentBucket = await bucketService.read(bucketId);

      // current user's permissions on parent bucket (folder)
      const currentUserParentBucketPerms = userId !== SYSTEM_USER ? (await bucketPermissionService.searchPermissions({
        bucketId: parentBucket.bucketId,
        userId: userId
      })).map(p => p.permCode) : [];

      /**
       * sync (ie create or delete) bucket records in COMS db to match 'folders' (S3 key prefixes) that exist in S3
      */
      // parent + child bucket records already in COMS db
      const dbChildBuckets = await bucketService.searchChildBuckets(parentBucket, false, userId);
      let dbBuckets = [parentBucket].concat(dbChildBuckets);
      // 'folders' that exist below (and including) the parent 'folder' in S3
      const s3Response = await storageService.listAllObjectVersions({ bucketId: bucketId, precisePath: false });
      const s3Keys = [...new Set([
        ...s3Response.DeleteMarkers.map(object => formatS3KeyForCompare(object.Key)),
        ...s3Response.Versions.map(object => formatS3KeyForCompare(object.Key)),
      ])];

      // Wrap sync sql operations in a single transaction
      const response = await utils.trxWrapper(async (trx) => {

        const syncedBuckets = await this.syncBucketRecords(
          dbBuckets,
          s3Keys,
          parentBucket,
          // assign current user's permissions on parent bucket to new sub-folders (buckets)
          currentUserParentBucketPerms,
          userId,
          trx
        );

        /**
         * Queue objects in all the folders for syncing
         */
        return await this.queueObjectRecords(syncedBuckets, s3Response, userId, trx);
      });

      // return number of jobs inserted
      res.status(202).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function syncBucketSingle
   * Synchronizes objects found at the Key of the given bucket, ignoring subfolders and files after the next delimiter
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async syncBucketSingle(req, res, next) {
    try {
      const bucketId = addDashesToUuid(req.params.bucketId);
      const bucket = await bucketService.read(bucketId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      const s3Objects = await storageService.listAllObjectVersions({ bucketId: bucketId, filterLatest: true });

      const response = await utils.trxWrapper(async (trx) => {
        return this.queueObjectRecords([bucket], s3Objects, userId, trx);
      });

      res.status(202).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
  * @function syncBucketRecords
  * Synchronizes (creates / prunes) COMS db bucket records for each 'directry' found in S3
  * Adds current user's permissions to all buckets
  * @param {object[]} Array of Bucket models - bucket records already in COMS db before syncing
  * @param {string[]} s3Keys Array of key prefixes from S3 representing 'directories'
  * @param {object} Bucket model for the COMS db bucket record of parent bucket
  * @param {string[]} currentUserParentBucketPerms Array of PermCodes to add to NEW buckets
  * @param {string} userId the guid of current user
  *  @param {object} [trx] An Objection Transaction object
  * @returns {string[]} And array of bucketId's for bucket records in COMS db
  */
  async syncBucketRecords(dbBuckets, s3Keys, parentBucket, currentUserParentBucketPerms, userId, trx) {
    try {
      // delete buckets not found in S3 from COMS db
      const oldDbBuckets = dbBuckets.filter(b => !s3Keys.includes(b.key));
      await Promise.all(
        oldDbBuckets.map(dbBucket =>
          bucketService.delete(dbBucket.bucketId, trx)
            .then(() => {
              dbBuckets = dbBuckets.filter(b => b.bucketId !== dbBucket.bucketId);
            })
        )
      );
      // add current user's permissions to all buckets
      await Promise.all(
        dbBuckets.map(bucket => {
          return bucketPermissionService.addPermissions(
            bucket.bucketId,
            currentUserParentBucketPerms.map(permCode => ({ userId, permCode })),
            undefined,
            trx
          );
        })
      );

      // Create buckets only found in S3 in COMS db
      const newS3Keys = s3Keys.filter(k => !dbBuckets.map(b => b.key).includes(k));
      await Promise.all(
        newS3Keys.map(s3Key => {
          const data = {
            bucketName: s3Key.substring(s3Key.lastIndexOf('/') + 1),
            accessKeyId: parentBucket.accessKeyId,
            bucket: parentBucket.bucket,
            endpoint: parentBucket.endpoint,
            key: s3Key,
            secretAccessKey: parentBucket.secretAccessKey,
            region: parentBucket.region ?? undefined,
            active: parentBucket.active,
            userId: parentBucket.createdBy ?? SYSTEM_USER,
            permCodes: currentUserParentBucketPerms
          };
          return bucketService.create(data, trx)
            .then((dbResponse) => {
              dbBuckets.push(dbResponse);
            });
        })
      );
      return dbBuckets;
    }
    catch (err) {
      log.error(err.message, { function: 'syncBucketRecords' });
      throw err;
    }
  },

  /**
   * @function queueObjectRecords
   * Synchronizes (creates / prunes) COMS db object records with state in S3
   * @param {object[]} dbBuckets Array of Bucket models in COMS db
   * @param {object} s3Objects The response from storage.listAllObjectVersions - and
   * object containg an array of DeleteMarkers and Versions
   * @param {string} userId the guid of current user
  *  @param {object} [trx] An Objection Transaction object
   * @returns {string[]} And array of bucketId's for bucket records in COMS db
   */
  async queueObjectRecords(dbBuckets, s3Objects, userId, trx) {
    try {
      // get all objects in existing buckets in all 'buckets' in COMS db
      const dbObjects = await objectService.searchObjects({
        bucketId: dbBuckets.map(b => b.bucketId)
      }, trx);

      /**
       * merge arrays of objects from COMS db and S3 to form an array of jobs with format:
       *  [ { path: '/images/img3.jpg', bucketId: '123' }, { path: '/images/album1/img1.jpg', bucketId: '456' } ]
       */
      const objects = [...new Set([
        // objects already in database
        ...dbObjects.data.map(object => {
          return {
            path: object.path,
            bucketId: object.bucketId
          };
        }),
        // DeleteMarkers found in S3
        ...s3Objects.DeleteMarkers.map(object => {
          return {
            path: object.Key,
            bucketId: dbBuckets.find(b => isPrefixOfPath(b.key, object.Key))?.bucketId
          };
        }),
        // Versions found in S3
        ...s3Objects.Versions
          .filter(v => v.Size > 0) // is an file (not a 'directory')
          .map(object => {
            return {
              path: object.Key,
              bucketId: dbBuckets.find(b => isPrefixOfPath(b.key, object.Key))?.bucketId
              // NOTE: adding current userId will give ALL perms on new objects
              // and set createdBy on all downstream resources (versions, tags, meta)
              // userId: userId
            };
          }),
      ])];

      // merge and remove duplicates
      const jobs = [...new Map(objects.map(o => [o.path, o])).values()];

      // create jobs in COMS db object_queue for each object
      // update 'lastSyncRequestedDate' value in COMS db for each bucket
      for (const bucket of dbBuckets) {
        await bucketService.update({
          bucketId: bucket.bucketId,
          userId: userId,
          lastSyncRequestedDate: new Date().toISOString()
        }, trx);
      }
      return await objectQueueService.enqueue({ jobs: jobs }, trx);
    }
    catch (err) {
      log.error(err.message, { function: 'queueObjectRecords' });
      throw err;
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
