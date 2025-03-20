const { NIL: SYSTEM_USER } = require('uuid');

const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getCurrentIdentity, isAtPath, isTruthy } = require('../components/utils');
const utils = require('../db/models/utils');
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
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
      const bucketId = addDashesToUuid(req.params.bucketId);
      const parentBucket = await bucketService.read(bucketId);
      // current user's permissions on parent folder
      const currentUserParentBucketPerms = userId !== SYSTEM_USER ? (await bucketPermissionService.searchPermissions({
        bucketId: parentBucket.bucketId,
        userId: userId
      })).map(p => p.permCode) : [];

      /**
       * get the two following lists for comparison:
       */
      // get parent + child bucket records already in COMS db
      const dbChildBuckets = await bucketService.searchChildBuckets(parentBucket);
      let dbBuckets = [parentBucket].concat(dbChildBuckets);

      // get 'folders' that exist below (and including) the parent 'folder'
      const s3Response = await storageService.listAllObjectVersions({ bucketId: bucketId, precisePath: false });
      const formatS3KeyForCompare = (k => {
        let key = k.substr(0, k.lastIndexOf('/')); // remove trailing slash and file name
        return key ? key : '/'; // if parent is root set as '/' to match convention in COMS db
      });
      const s3Keys = [...new Set([
        ...s3Response.DeleteMarkers.map(object => formatS3KeyForCompare(object.Key)),
        ...s3Response.Versions.map(object => formatS3KeyForCompare(object.Key)),
      ])];
      // console.log('s3Keys', s3Keys);


      /**
       * compare each list and sync (ie create or delete) bucket records in COMS db to match 'folders' that exist in S3
       * note: we assign all permissions to all users that created parent bucket
       */
      // delete buckets not found in S3 from COMS db
      const oldDbBuckets = dbBuckets.filter(b => !s3Keys.includes(b.key));
      for (const dbBucket of oldDbBuckets) {
        await bucketService.delete(dbBucket.bucketId);
        dbBuckets = dbBuckets.filter(b => b.bucketId != dbBucket.bucketId);
      }
      // Create buckets only found in S3 in COMS db
      const newS3Keys = s3Keys.filter(k => !dbBuckets.map(b => b.key).includes(k));
      for (const s3Key of newS3Keys) {
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
          // current user has MANAGE perm on parent folder (see route.hasPermission)
          // ..so copy all their perms to NEW subfolders
          permCodes: currentUserParentBucketPerms
        };
        const dbResponse = await bucketService.create(data);
        dbBuckets.push(dbResponse);
      }

      /**
       * Sync all the objects found in all the parent and child 'folders'.
       * by comparing objects in COMS db with the keys of the object found in S3
       */
      // get all objects in existing buckets in all 'buckets' in COMS db
      const dbObjects = await objectService.searchObjects({
        bucketId: dbBuckets.map(b => b.bucketId)
      });
      // get all objects below parent 'key' in S3
      const s3Objects = s3Response;

      console.log('s3Objects', s3Objects);


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
            bucketId: dbBuckets
              .filter(b => isAtPath(b.key, object.Key))
              .map(b => b.bucketId)[0]
          };
        }),
        // Versions found in S3
        ...s3Objects.Versions
          .filter(v => v.Size > 0) // is an file (not a 'directory')
          .map(object => {
            return {
              path: object.Key,
              bucketId: dbBuckets
                .filter(b => isAtPath(b.key, object.Key))
                .map(b => b.bucketId)[0],
              // adding current userId will give ALL perms on new objects
              // and set createdBy on all downstream resources (versions, tags, meta)
              // userId: userId
            };
          })
      ])];
      // merge and remove duplicates
      const jobs = [...new Map(objects.map(o => [o.path, o])).values()];

      // create jobs in COMS db object_queue for each object
      const response = await utils.trxWrapper(async (trx) => {
        // update 'lastSyncRequestedDate' value in COMS db for each bucket
        for (const bucket of dbBuckets) {
          await bucketService.update({
            bucketId: bucket.bucketId,
            userId: userId,
            lastSyncRequestedDate: new Date().toISOString()
          }, trx);
        }
        return await objectQueueService.enqueue({ jobs: jobs }, trx);
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
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      const [dbResponse, s3Response] = await Promise.all([
        objectService.searchObjects({ bucketId: bucketId }),
        storageService.listAllObjectVersions({ bucketId: bucketId, filterLatest: true })
      ]);

      // Aggregate and dedupe all file paths to consider
      const jobs = [...new Set([
        ...dbResponse.data.map(object => object.path),
        ...s3Response.DeleteMarkers.map(object => object.Key),
        ...s3Response.Versions.map(object => object.Key)
      ])].map(path => ({
        path: path,
        bucketId: bucketId
        // adding current userId will give ALL perms on new objects
        // and set createdBy on all downstream resources (versions, tags, meta)
        // userId: userId
      }));

      const response = await utils.trxWrapper(async (trx) => {
        await bucketService.update({
          bucketId: bucketId,
          userId: userId,
          lastSyncRequestedDate: new Date().toISOString()
        }, trx);
        return await objectQueueService.enqueue({ jobs: jobs }, trx);
      });
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
