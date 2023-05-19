const Problem = require('api-problem');
const busboy = require('busboy');
const config = require('config');
const cors = require('cors');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const {
  DEFAULTCORS,
  DownloadMode,
  MAXCOPYOBJECTLENGTH,
  MetadataDirective
} = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  getBucketId,
  getCurrentIdentity,
  getKeyValue,
  getMetadata,
  getPath,
  getS3VersionId,
  joinPath,
  isTruthy,
  mixedQueryToArray,
  toLowerKeys,
  getBucket,
  renameObjectProperty
} = require('../components/utils');
const utils = require('../db/models/utils');

const {
  bucketPermissionService,
  metadataService,
  objectService,
  storageService,
  tagService,
  userService,
  versionService,
} = require('../services');

const SERVICE = 'ObjectService';

/**
 * The Object Controller
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
   * @function addMetadata
   * Creates a new version of the object via copy with the new metadata added
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async addMetadata(req, res, next) {
    try {
      const bucketId = req.currentObject?.bucketId;
      const objId = addDashesToUuid(req.params.objectId);
      const objPath = await getPath(objId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));

      // get source S3 VersionId
      const sourceS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      // get version from S3
      const source = await storageService.headObject({ filePath: objPath, s3VersionId: sourceS3VersionId, bucketId });
      if (source.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      const metadataToAppend = getMetadata(req.headers);
      if (!Object.keys(metadataToAppend).length) {
        // TODO: Validation level logic. To be moved.
        // 422 when no keys present
        res.status(422).end();
      }
      else {
        const data = {
          bucketId,
          copySource: objPath,
          filePath: objPath,
          metadata: {
            ...source.Metadata,  // Take existing metadata first
            ...metadataToAppend, // Append new metadata
            'coms-id': source.Metadata['coms-id'] // Always enforce coms-id key behavior
          },
          metadataDirective: MetadataDirective.REPLACE,
          s3VersionId: sourceS3VersionId
        };
        // create new version with metadata in S3
        const s3Response = await storageService.copyObject(data);

        await utils.trxWrapper(async (trx) => {
          // create or update version in DB (if a non-versioned object)
          const version = s3Response.VersionId ?
            await versionService.copy(sourceS3VersionId, s3Response.VersionId, objId, userId, trx) :
            await versionService.update({ ...data, id: objId }, userId, trx);

          // update metadata for version in DB
          await metadataService.associateMetadata(version.id, getKeyValue(data.metadata), userId, trx);
        });

        res.status(204).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function addTags
   * Adds the tag set to the requested object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async addTags(req, res, next) {
    try {
      const bucketId = req.currentObject?.bucketId;
      const objId = addDashesToUuid(req.params.objectId);
      const objPath = await getPath(objId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      const newTags = req.query.tagset;

      // get source S3 Version to add to
      const sourceS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      // get current tags on latest or specified version
      const objectTagging = await storageService.getObjectTagging({ filePath: objPath, s3VersionId: sourceS3VersionId, bucketId });

      // Join new and existing tags then filter duplicates
      let newSet = newTags ? Object.entries(newTags).map(([k, v]) => ({ Key: k, Value: v })) : [];
      if (objectTagging.TagSet) newSet = newSet.concat(objectTagging.TagSet);
      newSet = newSet.filter((element, idx, arr) => arr.findIndex(element2 => (element2.Key === element.Key)) === idx);

      if (!newTags || !Object.keys(newTags).length || newSet.length > 10) {
        // TODO: Validation level logic. To be moved.
        // 422 when no new tags or when tag limit will be exceeded
        res.status(422).end();
      } else {
        const data = {
          bucketId,
          filePath: objPath,
          tags: newSet,
          s3VersionId: sourceS3VersionId ? sourceS3VersionId.toString() : undefined
        };
        // Add tags to the version in S3
        await storageService.putObjectTagging(data);

        // Add tags to version in DB
        await utils.trxWrapper(async (trx) => {
          const version = await versionService.get({ s3VersionId: data.s3VersionId, objectId: objId }, trx);
          // use replaceTags() in case they are replacing an existing tag with same key which we need to dissociate
          await tagService.replaceTags(version.id, toLowerKeys(data.tags), userId, trx);
        });

        res.status(204).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function createObjects
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async createObjects(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers });
      const objects = [];
      const bucketId = req.query.bucketId ? addDashesToUuid(req.query.bucketId) : undefined;
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      // if target bucket specified AND request is by an OIDC user,
      // check for CREATE permission on bucket
      if (bucketId && userId) {
        const permission = await bucketPermissionService.searchPermissions({ userId: userId, bucketId: bucketId, permCode: 'CREATE' });
        if (!permission.length) {
          return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
        }
      }
      // Preflight check bucketId before proceeding with any object operations
      const bucketKey = (await getBucket(bucketId, true)).key;

      bb.on('file', (name, stream, info) => {
        const objId = uuidv4();

        const data = {
          id: objId,
          fieldName: name,
          name: info.filename,
          mimeType: info.mimeType,
          metadata: getMetadata(req.headers),
          tags: {
            ...req.query.tagset,
            // enforce tag `coms-id: <object ID>`
            'coms-id': objId
          },
          bucketId: bucketId
        };

        const s3Response = storageService.upload({ ...data, stream });
        const dbResponse = utils.trxWrapper(async (trx) => {
          // create object
          const object = await objectService.create({
            ...data,
            userId: userId,
            path: joinPath(bucketKey, data.name)
          }, trx);

          // create S3 upload promise
          const s3Resolved = await s3Response;

          // create new version in DB
          const s3VersionId = s3Resolved.VersionId ? s3Resolved.VersionId : null;
          const version = await versionService.create({ ...data, s3VersionId: s3VersionId, etag: s3Resolved.ETag }, userId, trx);
          object['versionId'] = version.id;

          // add metadata to version in DB
          await metadataService.associateMetadata(version.id, getKeyValue(data.metadata), userId, trx);

          // add tags to version in DB
          if (data.tags && Object.keys(data.tags).length) await tagService.associateTags(version.id, getKeyValue(data.tags), userId, trx);

          return object;
        });

        objects.push({
          data: data,
          dbResponse: dbResponse,
          s3Response: s3Response
        });
      });

      bb.on('close', async () => {
        await Promise.all(objects.map(async (object) => {
          // wait for file to finish uploading to S3
          object.s3Response = await object.s3Response;
          // wait for object and permission db update
          object.dbResponse = await object.dbResponse;
        }));

        // merge returned responses into a result
        const result = objects.map((object) => ({
          ...object.data,
          ...object.dbResponse,
          ...renameObjectProperty(object.s3Response, 'VersionId', 's3VersionId')
        }));
        res.status(201).json(result);
      });

      req.pipe(bb);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function deleteMetadata
   * Creates a new version of the object via copy with the given metadata removed
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async deleteMetadata(req, res, next) {
    try {
      const bucketId = req.currentObject?.bucketId;
      const objId = addDashesToUuid(req.params.objectId);
      const objPath = await getPath(objId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));

      // Source S3 Version to copy from
      const sourceS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      const source = await storageService.headObject({ filePath: objPath, s3VersionId: sourceS3VersionId, bucketId });
      if (source.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      // Generate object subset by subtracting/omitting defined keys via filter/inclusion
      const keysToRemove = Object.keys(getMetadata(req.headers));
      let metadata = undefined;
      if (keysToRemove.length) {
        metadata = Object.fromEntries(
          Object.entries(source.Metadata)
            .filter(([key]) => !keysToRemove.includes(key))
        );
      }

      const data = {
        bucketId,
        copySource: objPath,
        filePath: objPath,
        metadata: {
          ...metadata,
          'coms-name': source.Metadata['coms-name'],  // Always enforce name and id key behavior
          'coms-id': source.Metadata['coms-id']
        },
        metadataDirective: MetadataDirective.REPLACE,
        s3VersionId: sourceS3VersionId
      };
      // create new version with metadata in S3
      const s3Response = await storageService.copyObject(data);

      await utils.trxWrapper(async (trx) => {
        // create or update version in DB(if a non-versioned object)
        const version = s3Response.VersionId ?
          await versionService.copy(sourceS3VersionId, s3Response.VersionId, objId, userId, trx) :
          await versionService.update({ ...data, id: objId }, userId, trx);
        // add metadata to version in DB
        await metadataService.associateMetadata(version.id, getKeyValue(data.metadata), userId, trx);
      });

      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function deleteObject
   * Deletes the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async deleteObject(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objectId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));

      // target S3 version to delete
      const targetS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      const data = {
        bucketId: req.currentObject?.bucketId,
        filePath: await getPath(objId),
        s3VersionId: targetS3VersionId
      };

      // delete version on S3
      const s3Response = await storageService.deleteObject(data);

      // if request is to delete a version
      if (data.s3VersionId) {
        const objectVersionId = s3Response.VersionId;
        // delete version in DB
        await versionService.delete(objId, objectVersionId);
        // prune tags amd metadata
        await metadataService.pruneOrphanedMetadata();
        await tagService.pruneOrphanedTags();
        // if other versions in DB, delete object record
        const remainingVersions = await versionService.list(objId);
        if (remainingVersions.length === 0) await objectService.delete(objId);
      } else { // else deleting the object
        // if versioning enabled s3Response will contain DeleteMarker: true
        if (s3Response.DeleteMarker) {
          // create DeleteMarker version in DB
          const deleteMarker = {
            id: objId,
            deleteMarker: true,
            s3VersionId: s3Response.VersionId
          };
          await versionService.create(deleteMarker, userId);
        } else { // else object in bucket is not versioned
          // delete object record from DB
          await objectService.delete(objId);
          // prune tags amd metadata
          await metadataService.pruneOrphanedMetadata();
          await tagService.pruneOrphanedTags();
        }
      }

      res.status(200).json(renameObjectProperty(s3Response, 'VersionId', 's3VersionId'));
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function deleteTags
   * Deletes the tag set on the requested object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async deleteTags(req, res, next) {
    try {
      const bucketId = req.currentObject?.bucketId;
      const objId = addDashesToUuid(req.params.objectId);
      const objPath = await getPath(objId);

      // Target S3 version
      const targetS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      const objectTagging = await storageService.getObjectTagging({ filePath: objPath, s3VersionId: targetS3VersionId, bucketId });

      // Generate object subset by subtracting/omitting defined keys via filter/inclusion
      const keysToRemove = req.query.tagset ? Object.keys(req.query.tagset) : [];
      let newTags = undefined;
      if (keysToRemove.length && objectTagging.TagSet) {
        newTags = objectTagging.TagSet.filter(x => !keysToRemove.includes(x.Key));
      }

      const data = {
        bucketId,
        filePath: objPath,
        tags: newTags,
        s3VersionId: targetS3VersionId
      };

      // Update tags for version in S3
      if (newTags && newTags.length) {
        await storageService.putObjectTagging(data);
      } else {
        await storageService.deleteObjectTagging(data);
      }
      // dissociate provided tags or all tags if no tagset passed in query parameter
      await utils.trxWrapper(async (trx) => {
        const version = await versionService.get({ s3VersionId: data.s3VersionId, objectId: objId }, trx);

        let dissociateTags = [];
        if (req.query.tagset) {
          dissociateTags = getKeyValue(req.query.tagset);
        } else if (objectTagging.TagSet && objectTagging.TagSet.length) {
          dissociateTags = toLowerKeys(objectTagging.TagSet);
        }
        if (dissociateTags.length) await tagService.dissociateTags(version.id, dissociateTags, trx);
      });

      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function fetchMetadata
   * Fetch metadata for specific objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async fetchMetadata(req, res, next) {
    try {
      const objIds = mixedQueryToArray(req.query.objectId);
      const metadata = getMetadata(req.headers);
      const params = {
        objId: objIds ? objIds.map(id => addDashesToUuid(id)) : objIds,
        metadata: metadata && Object.keys(metadata).length ? metadata : undefined
      };
      // if scoping to current user permissions on objects
      if (config.has('server.privacyMask')) {
        params.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      }
      const response = await metadataService.fetchMetadataForObject(params);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @function fetchTags
   * Fetch tags for specific objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async fetchTags(req, res, next) {
    try {
      const objIds = mixedQueryToArray(req.query.objectId);
      const tagset = req.query.tagset;
      const params = {
        objectIds: objIds ? objIds.map(id => addDashesToUuid(id)) : objIds,
        tagset: tagset && Object.keys(tagset).length ? tagset : undefined,
      };
      // if scoping to current user permissions on objects
      if (config.has('server.privacyMask')) {
        params.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      }
      const response = await tagService.fetchTagsForObject(params);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @function headObject
   * Returns object headers
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async headObject(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objectId);

      // target S3 version
      const targetS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      const data = {
        bucketId: req.currentObject?.bucketId,
        filePath: await getPath(objId),
        s3VersionId: targetS3VersionId
      };
      const response = await storageService.headObject(data);

      // TODO: Proper 304 caching logic (with If-Modified-Since header support)
      // Consider looking around for express-based caching middleware
      // Perhaps npm express-preconditions is sufficient?

      // Set Headers via CORS library
      cors({
        exposedHeaders: controller._processS3Headers(response, res),
        ...DEFAULTCORS
      })(req, res, () => { });
      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function listObjectVersion
   * List all versions of the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listObjectVersion(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objectId);

      const response = await versionService.list(objId);
      // TODO: sync with current versions in S3
      // const data = { filePath: await getPath(objId) };
      // const s3Versions = await storageService.listObjectVersion(data);

      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function readObject
   * Reads via streaming or returns a presigned URL for the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async readObject(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objectId);

      // target S3 version
      const targetS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      const data = {
        // TODO: use req.currentObject.bucketId
        bucketId: await getBucketId(objId),
        filePath: await getPath(objId),
        s3VersionId: targetS3VersionId
      };

      // Download via service proxy
      if (req.query.download && req.query.download === DownloadMode.PROXY) {
        // TODO: Consider if we need a HEAD operation first before doing the actual read on large files for pre-flight caching behavior?
        const response = await storageService.readObject(data);

        // Set Headers via CORS library
        cors({
          exposedHeaders: controller._processS3Headers(response, res),
          ...DEFAULTCORS
        })(req, res, () => { });

        // TODO: Proper 304 caching logic (with If-Modified-Since header support)
        // Consider looking around for express-based caching middleware
        // Perhaps npm express-preconditions is sufficient?
        if (req.get('If-None-Match') === response.ETag) res.status(304).end();
        else {
          response.Body.pipe(res); // Stream body content directly to response
          res.status(200);
        }
      } else {
        const signedUrl = await storageService.readSignedUrl({
          expiresIn: req.query.expiresIn,
          ...data
        });

        // Present download url link
        if (req.query.download && req.query.download === DownloadMode.URL) {
          res.status(201).json(signedUrl);
          // Download via HTTP redirect
        } else {
          res.status(302).set('Location', signedUrl).end();
        }
      }

    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function replaceMetadata
   * Creates a new version of the object via copy with the new metadata replacing the previous
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async replaceMetadata(req, res, next) {
    try {
      const bucketId = req.currentObject?.bucketId;
      const objId = addDashesToUuid(req.params.objectId);
      const objPath = await getPath(objId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));

      // source S3 version
      const sourceS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      // get metadata for source version
      const source = await storageService.headObject({ filePath: objPath, s3VersionId: sourceS3VersionId, bucketId });
      if (source.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      const newMetadata = getMetadata(req.headers);
      const data = {
        bucketId,
        copySource: objPath,
        filePath: objPath,
        metadata: {
          'coms-name': source.Metadata['coms-name'],  // Always enforce coms-name and coms-id key behavior
          ...newMetadata, // Add new metadata
          'coms-id': source.Metadata['coms-id']
        },
        metadataDirective: MetadataDirective.REPLACE,
        s3VersionId: sourceS3VersionId
      };
      const s3Response = await storageService.copyObject(data);

      await utils.trxWrapper(async (trx) => {
        // create or update version (if a non-versioned object)
        const version = s3Response.VersionId ?
          await versionService.copy(sourceS3VersionId, s3Response.VersionId, objId, userId, trx) :
          await versionService.update({ ...data, id: objId }, userId, trx);

        // add metadata
        await metadataService.associateMetadata(version.id, getKeyValue(data.metadata), userId, trx);
      });

      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function replaceTags
   * Replaces the tag set on the requested object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async replaceTags(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objectId);
      const objPath = await getPath(objId);
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      const newTags = req.query.tagset;

      // source S3 version
      const sourceS3VersionId = await getS3VersionId(req.query.s3VersionId, addDashesToUuid(req.query.versionId), objId);

      if (!newTags || !Object.keys(newTags).length || Object.keys(newTags).length > 10) {
        // TODO: Validation level logic. To be moved.
        // 422 when no new tags or when tag limit will be exceeded
        res.status(422).end();
      } else {
        const data = {
          bucketId: req.currentObject?.bucketId,
          filePath: objPath,
          tags: Object.entries(newTags).map(([k, v]) => ({ Key: k, Value: v })),
          s3VersionId: sourceS3VersionId
        };

        // Add tags to the object in S3
        await storageService.putObjectTagging(data);

        // update tags on version in DB
        await utils.trxWrapper(async (trx) => {
          const version = await versionService.get({ s3VersionId: data.s3VersionId, objectId: objId }, trx);
          await tagService.replaceTags(version.id, toLowerKeys(data.tags), userId, trx);
        });

        res.status(204).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function searchObjects
   * Search and filter for specific objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchObjects(req, res, next) {
    // TODO: Handle no database scenarios via S3 ListObjectsCommand?
    // TODO: Consider support for filtering by set of permissions?
    // TODO: handle additional parameters. Eg: deleteMarker, latest
    try {
      const bucketIds = mixedQueryToArray(req.query.bucketId);
      const objIds = mixedQueryToArray(req.query.objectId);
      const metadata = getMetadata(req.headers);
      const tagging = req.query.tagset;
      const params = {
        id: objIds ? objIds.map(id => addDashesToUuid(id)) : objIds,
        bucketId: bucketIds ? bucketIds.map(id => addDashesToUuid(id)) : bucketIds,
        name: req.query.name,
        path: req.query.path,
        mimeType: req.query.mimeType,
        metadata: metadata && Object.keys(metadata).length ? metadata : undefined,
        tag: tagging && Object.keys(tagging).length ? tagging : undefined,
        public: isTruthy(req.query.public),
        active: isTruthy(req.query.active),
        deleteMarker: isTruthy(req.query.deleteMarker),
        latest: isTruthy(req.query.latest)
      };
      // if scoping to current user permissions on objects
      if (config.has('server.privacyMask')) {
        params.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      }
      const response = await objectService.searchObjects(params);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @function togglePublic
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async togglePublic(req, res, next) {
    try {
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);
      const data = {
        id: addDashesToUuid(req.params.objectId),
        public: isTruthy(req.query.public) ?? false,
        userId: userId
      };

      const response = await objectService.update(data);

      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function updateObject
   * Creates an updated version of the object via streaming
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async updateObject(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers, limits: { files: 1 } });
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      let object = undefined;

      // Preflight check bucketId before proceeding with any object operations
      const bucketId = req.currentObject?.bucketId;
      const bucketKey = (await getBucket(bucketId, true)).key;

      bb.on('file', (name, stream, info) => {
        const objId = addDashesToUuid(req.params.objectId);
        const data = {
          bucketId,
          id: objId,
          fieldName: name,
          name: req.currentObject.name,
          mimeType: info.mimeType,
          metadata: getMetadata(req.headers),
          tags: {
            ...req.query.tagset,
            // enforce tag `coms-id: <object ID>`
            'coms-id': objId
          },
        };

        const s3Response = storageService.upload({ ...data, stream });
        const dbResponse = utils.trxWrapper(async (trx) => {
          // update object in DB
          const object = await objectService.update({
            ...data,
            userId: userId,
            path: joinPath(bucketKey, data.name)
          }, trx);

          // wait for S3 response
          const s3Resolved = await s3Response;
          // if versioning enabled, create new version in DB
          let version = undefined;
          if (s3Resolved.VersionId) {
            const s3VersionId = s3Resolved.VersionId;
            version = await versionService.create({ ...data, s3VersionId: s3VersionId, etag: s3Resolved.ETag }, userId, trx);
          }
          // else update only version in DB
          else {
            version = await versionService.update({
              ...data,
              s3VersionId: null,
              etag: s3Resolved.ETag
            }, userId, trx);
          }
          object['versionId'] = version.id;

          // add metadata to version in DB
          if (data.metadata && Object.keys(data.metadata).length) await metadataService.associateMetadata(version.id, getKeyValue(data.metadata), userId, trx);

          // add tags to version in DB
          if (data.tags && Object.keys(data.tags).length) await tagService.replaceTags(version.id, getKeyValue(data.tags), userId, trx);

          return object;
        });

        object = {
          data: data,
          dbResponse: dbResponse,
          s3Response: s3Response
        };
      });

      bb.on('close', async () => {
        const [dbResponse, s3Response] = await Promise.all([
          object.dbResponse,
          object.s3Response
        ]);

        // merge returned responses into a result
        const result = {
          ...object.data,
          ...dbResponse,
          ...renameObjectProperty(s3Response, 'VersionId', 's3VersionId')
        };
        res.status(200).json(result);
      });

      req.pipe(bb);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
