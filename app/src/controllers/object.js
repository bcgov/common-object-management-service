const busboy = require('busboy');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { AuthMode, MAXCOPYOBJECTLENGTH, MetadataDirective } = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  getAppAuthMode,
  getKeyValue,
  getMetadata,
  getPath,
  isTruthy,
  mixedQueryToArray,
  toLowerKeys
} = require('../components/utils');
const utils = require('../db/models/utils');

const {
  metadataService,
  objectService,
  storageService,
  tagService,
  userService,
  versionService
} = require('../services');

const SERVICE = 'ObjectService';

const authMode = getAppAuthMode();

/**
 * The Object Controller
 */
const controller = {
  /**
   * @function _setS3Headers
   * Accepts a typical S3 response object and inserts appropriate express response headers
   * @param {object} s3Resp S3 response object
   * @param {object} res Express response object
   */
  _setS3Headers(s3Resp, res) {
    // TODO: Consider looking around for express-based header middleware
    if (s3Resp.ContentLength) res.set('Content-Length', s3Resp.ContentLength);
    if (s3Resp.ContentType) res.set('Content-Type', s3Resp.ContentType);
    if (s3Resp.ETag) res.set('ETag', s3Resp.ETag);
    if (s3Resp.LastModified) res.set('Last-Modified', s3Resp.LastModified);
    if (s3Resp.ServerSideEncryption) res.set('x-amz-server-side-encryption', s3Resp.ServerSideEncryption);
    if (s3Resp.VersionId) res.set('x-amz-version-id', s3Resp.VersionId);
    if (s3Resp.Metadata) {
      Object.entries(s3Resp.Metadata).forEach(([key, value]) => {
        res.set(`x-amz-meta-${key}`, value);
      });
      if (s3Resp.Metadata.name) res.attachment(s3Resp.Metadata.name);
    }
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
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const userId = await userService.getCurrentUserId(req.currentUser);
      const sourceVersionId = req.query.versionId ? req.query.versionId.toString() : undefined;

      const source = await storageService.headObject({ filePath: objPath, versionId: sourceVersionId });
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
          copySource: objPath,
          filePath: objPath,
          metadata: {
            ...source.Metadata,  // Take existing metadata first
            ...metadataToAppend, // Append new metadata
            id: source.Metadata.id // Always enforce id key behavior
          },
          metadataDirective: MetadataDirective.REPLACE,
          versionId: sourceVersionId
        };
        // create new version with metadata in S3
        const s3Response = await storageService.copyObject(data);


        await utils.trxWrapper(async (trx) => {
          // create or update version in DB (if a non-versioned object)
          const version = s3Response.VersionId ?
            await versionService.copy(sourceVersionId, s3Response.VersionId, objId, userId, trx) :
            await versionService.update({ ...data, id: objId }, userId, trx);

          // add metadata to version in DB
          await metadataService.addMetadata(version.id, data.metadata, userId, trx);
        });

        controller._setS3Headers(s3Response, res);
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
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const userId = await userService.getCurrentUserId(req.currentUser);
      const { versionId, ...newTags } = req.query;
      const objectTagging = await storageService.getObjectTagging({ filePath: objPath, versionId });

      // Join new and existing tags then filter duplicates
      let newSet = Object.entries(newTags).map(([k, v]) => ({ Key: k, Value: v }));
      if (objectTagging.TagSet) newSet = newSet.concat(objectTagging.TagSet);
      newSet = newSet.filter((element, idx, arr) => arr.findIndex(element2 => (element2.Key === element.Key)) === idx);

      if (!Object.keys(newTags).length || newSet.length > 10) {
        // TODO: Validation level logic. To be moved.
        // 422 when no new tags or when tag limit will be exceeded
        res.status(422).end();
      }
      else {
        const data = {
          filePath: objPath,
          tags: newSet,
          versionId: versionId ? versionId.toString() : undefined
        };
        // Add tags to the version in S3
        const response = await storageService.putObjectTagging(data);

        // Add tags to version in DB
        await utils.trxWrapper(async (trx) => {
          const version = await versionService.get(data.versionId, objId, trx);
          await tagService.addTags(version.id, toLowerKeys(data.tags), userId, trx);
        });

        controller._setS3Headers(response, res);
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
      const userId = await userService.getCurrentUserId(req.currentUser);
      console.log(userId);

      bb.on('file', (name, stream, info) => {
        const objId = uuidv4();
        const data = {
          id: objId,
          fieldName: name,
          mimeType: info.mimeType,
          metadata: {
            name: info.filename,  // provide a default of `name: <file name>`
            ...getMetadata(req.headers),
            id: objId
          },
          tags: req.query,
        };

        const s3Response = storageService.putObject({ ...data, stream });

        const dbResponse = utils.trxWrapper(async (trx) => {
          // create object
          const object = await objectService.create({ ...data, userId, path: getPath(objId) }, trx);

          // create new version in DB
          const s3Resolved = await s3Response;
          data.versionId = s3Resolved.VersionId;
          const versions = await versionService.create(data, userId, trx);

          // add metadata to version in DB
          if (Object.keys(data.metadata).length) await metadataService.addMetadata(versions.id, data.metadata, userId, trx);

          // add tags to version in DB
          if (Object.keys(data.tags).length) await tagService.addTags(versions.id, getKeyValue(data.tags), userId, trx);

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
          ...object.s3Response
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
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const userId = await userService.getCurrentUserId(req.currentUser);

      const sourceVersionId = req.query.versionId ? req.query.versionId.toString() : undefined;

      const source = await storageService.headObject({ filePath: objPath, versionId: sourceVersionId });
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
        copySource: objPath,
        filePath: objPath,
        metadata: {
          ...metadata,
          name: source.Metadata.name,  // Always enforce name and id key behavior
          id: source.Metadata.id
        },
        metadataDirective: MetadataDirective.REPLACE,
        versionId: sourceVersionId
      };
      // create new version with metadata in S3
      const s3Response = await storageService.copyObject(data);

      await utils.trxWrapper(async (trx) => {
        // create or update version in DB(if a non-versioned object)
        const version = s3Response.VersionId ?
          await versionService.copy(sourceVersionId, s3Response.VersionId, objId, userId, trx) :
          await versionService.update({ ...data, id: objId }, userId, trx);

        // add metadata to version in DB
        await metadataService.addMetadata(version.id, data.metadata, userId, trx);
      });

      controller._setS3Headers(s3Response, res);
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
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId),
        versionId: req.query.versionId
      };
      const userId = await userService.getCurrentUserId(req.currentUser);

      // delete version on S3
      const s3Response = await storageService.deleteObject(data);

      // if request is to delete a version
      if (data.versionId) {
        const objectVersionId = s3Response.VersionId;
        // delete version in DB
        await versionService.delete(objId, objectVersionId);
        // if other versions in DB, delete object record
        // TODO: synch with versions in S3
        const remainingVersions = await versionService.list(objId);
        if (remainingVersions.length === 0) await objectService.delete(objId);
      }
      // else deleting the object
      else {
        // if versioning enabled s3Response will contain DeleteMarker: true
        if (s3Response.DeleteMarker) {
          // create DeleteMarker version in DB
          const deleteMarker = {
            id: objId,
            deleteMarker: true,
            versionId: s3Response.VersionId,
            mimeType: null
          };
          await versionService.create(deleteMarker, userId);
        }
        // else object in bucket is not versioned
        else {
          // delete object record from DB
          await objectService.delete(objId);
        }
      }
      res.status(200).json(s3Response);
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
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const { versionId } = req.query;
      const userId = await userService.getCurrentUserId(req.currentUser);
      const objectTagging = await storageService.getObjectTagging({ filePath: objPath, versionId });

      // Generate object subset by subtracting/omitting defined keys via filter/inclusion
      const keysToRemove = mixedQueryToArray(req.query.keys);
      let newTags = undefined;
      if (keysToRemove && objectTagging.TagSet) {
        newTags = objectTagging.TagSet.filter(x => !keysToRemove.includes(x.Key));
      }

      const data = {
        filePath: objPath,
        tags: newTags,
        versionId: versionId ? versionId.toString() : undefined
      };

      // Update tags for version in S3
      let response;
      if (newTags) {
        response = await storageService.putObjectTagging(data);
      }
      else {
        response = await storageService.deleteObjectTagging(data);
      }
      // update tags for version in DB
      await utils.trxWrapper(async (trx) => {
        const version = await versionService.get(data.versionId, objId, trx);
        await tagService.addTags(version.id, toLowerKeys(data.tags), userId, trx);
      });

      controller._setS3Headers(response, res);
      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
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
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId),
        versionId: req.query.versionId ? req.query.versionId.toString() : undefined
      };
      const response = await storageService.headObject(data);
      // Set Headers
      // TODO: Consider adding 'x-coms-public' and 'x-coms-path' headers into API spec?
      controller._setS3Headers(response, res);
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
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId)
      };

      const response = await storageService.listObjectVersion(data);
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
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId),
        versionId: req.query.versionId ? req.query.versionId.toString() : undefined
      };

      // Download through service
      if (!req.query.expiresIn && req.query.download) {
        const response = await storageService.readObject(data);

        // Set Headers
        controller._setS3Headers(response, res);

        // TODO: Proper 304 caching logic (with If-Modified-Since header support)
        // Consider looking around for express-based caching middleware
        if (req.get('If-None-Match') === response.ETag) res.status(304).end();
        else {
          response.Body.pipe(res); // Stream body content directly to response
          res.status(200);
        }
      }

      // Download via redirect
      else {
        const response = await storageService.readSignedUrl({
          expiresIn: req.query.expiresIn,
          ...data
        });
        res.status(302).set('Location', response).end();
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
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const userId = await userService.getCurrentUserId(req.currentUser);
      const sourceVersionId = req.query.versionId ? req.query.versionId.toString() : undefined;

      const source = await storageService.headObject({ filePath: objPath, versionId: sourceVersionId });
      if (source.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      const newMetadata = getMetadata(req.headers);
      if (!Object.keys(newMetadata).length) {
        // TODO: Validation level logic. To be moved.
        // 422 when no keys present
        res.status(422).end();
      }
      else {
        const data = {
          copySource: objPath,
          filePath: objPath,
          metadata: {
            name: source.Metadata.name,  // Always enforce name and id key behavior
            ...newMetadata, // Add new metadata
            id: source.Metadata.id
          },
          metadataDirective: MetadataDirective.REPLACE,
          versionId: sourceVersionId
        };
        const s3Response = await storageService.copyObject(data);

        await utils.trxWrapper(async (trx) => {
          // create or update version (if a non-versioned object)
          const version = s3Response.VersionId ?
            await versionService.copy(sourceVersionId, s3Response.VersionId, objId, userId, trx) :
            await versionService.update({ ...data, id: objId }, userId, trx);

          // add metadata
          await metadataService.addMetadata(version.id, data.metadata, userId, trx);
        });

        controller._setS3Headers(s3Response, res);
        res.status(204).end();
      }
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
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const userId = await userService.getCurrentUserId(req.currentUser);
      const { versionId, ...newTags } = req.query;

      if (!Object.keys(newTags).length || Object.keys(newTags).length > 10) {
        // TODO: Validation level logic. To be moved.
        // 422 when no new tags or when tag limit will be exceeded
        res.status(422).end();
      }
      else {
        const data = {
          filePath: objPath,
          tags: Object.entries(newTags).map(([k, v]) => ({ Key: k, Value: v })),
          versionId: versionId ? versionId.toString() : undefined
        };

        // Add tags to the object in S3
        const response = await storageService.putObjectTagging(data);

        // update tags on version in DB
        await utils.trxWrapper(async (trx) => {
          const version = await versionService.get(data.versionId, objId, trx);
          await tagService.addTags(version.id, toLowerKeys(data.tags), userId, trx);
        });

        controller._setS3Headers(response, res);
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
    // TODO: Consider metadata/tagging query parameter design here?
    // TODO: Consider support for filtering by set of permissions?
    // TODO: handle additional parameters. Eg: deleteMarker, latest
    try {
      const objIds = mixedQueryToArray(req.query.objId);
      const params = {
        id: objIds ? objIds.map(id => addDashesToUuid(id)) : objIds,
        name: req.query.name,
        path: req.query.path,
        mimeType: req.query.mimeType,
        public: isTruthy(req.query.public),
        active: isTruthy(req.query.active)
      };

      // When using OIDC authentication, force populate current user as filter if available
      if (authMode === AuthMode.OIDCAUTH || authMode === AuthMode.FULLAUTH) {
        params.userId = await userService.getCurrentUserId(req.currentUser);
      }
      const response = await objectService.searchObjects(params);
      res.status(201).json(response);
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
      const userId = await userService.getCurrentUserId(req.currentUser, SYSTEM_USER);
      const data = {
        id: addDashesToUuid(req.params.objId),
        public: isTruthy(req.query.public),
        updatedBy: userId
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
      const userId = await userService.getCurrentUserId(req.currentUser);
      const { ...newTags } = req.query;
      let object = undefined;

      bb.on('file', (name, stream, info) => {
        const objId = addDashesToUuid(req.params.objId);
        const data = {
          id: objId,
          fieldName: name,
          mimeType: info.mimeType,
          metadata: {
            name: info.filename,
            ...getMetadata(req.headers),
            id: objId
          },
          tags: newTags
        };

        const s3Response = storageService.putObject({ ...data, stream });

        const dbResponse = utils.trxWrapper(async (trx) => {
          // update object in DB
          const object = await objectService.update({ ...data, userId, path: getPath(objId) }, trx);

          // wait for S3 response
          const s3Resolved = await s3Response;
          // if versioning enabled, create new version in DB
          let version = undefined;
          if (s3Resolved.VersionId) {
            data.versionId = s3Resolved.VersionId;
            version = await versionService.create(data, userId, trx);
          }
          // else update only version in DB
          else {
            version = await versionService.update({
              ...data,
              versionId: null
            }, userId, trx);
          }

          // add metadata to version in DB
          if (Object.keys(data.metadata).length) await metadataService.addMetadata(version.id, data.metadata, userId, trx);

          // add tags to version in DB
          if (Object.keys(data.tags).length)  await tagService.addTags(version.id, getKeyValue(data.tags), userId, trx);

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
          ...s3Response
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
