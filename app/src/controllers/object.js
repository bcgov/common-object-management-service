const busboy = require('busboy');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { AuthMode } = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const { getAppAuthMode, getCurrentOidcId, getPath } = require('../components/utils');
const { objectService, storageService } = require('../services');

const SERVICE = 'ObjectService';

const authMode = getAppAuthMode();

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

  /** Creates new objects */
  createObjects(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers });
      const objects = [];
      const oidcId = getCurrentOidcId(req.currentUser);

      bb.on('file', (name, stream, info) => {
        const objId = uuidv4();
        const data = {
          id: objId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename
          // TODO: Implement metadata and tag support - request shape TBD
          // metadata: { foo: 'bar', baz: 'bam' }
          // tags: { foo: 'bar', baz: 'bam' }
        };
        objects.push({
          data: data,
          dbResponse: objectService.create({ ...data, oidcId, path: getPath(objId) }),
          s3Response: storageService.putObject({ ...data, stream })
        });
      });
      bb.on('close', async () => {
        const result = await Promise.all(objects.map(async (object) => ({
          ...object.data,
          ...await object.dbResponse,
          ...await object.s3Response
        })));
        res.status(200).json(result);
      });

      req.pipe(bb);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Deletes the object */
  async deleteObject(req, res, next) {
    try {
      const data = {
        filePath: getPath(req.params.objId)
      };

      await objectService.delete(req.params.objId);
      const response = await storageService.deleteObject(data); // Attempt deletion operation
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Returns object headers */
  async headObject(req, res, next) {
    try {
      const data = {
        filePath: getPath(req.params.objId),
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

  /** List and search for all objects */
  // TODO: Consider metadata/tagging query parameter design
  // TODO: Consider accepting oidcId as a query parameter
  // TODO: Add support for filtering by set of permissions
  async listObjects(req, res, next) {
    try {
      let response = undefined;
      if (authMode === AuthMode.NOAUTH || authMode === AuthMode.BASICAUTH) {
        response = await objectService.listObjects();
      } else if (authMode === AuthMode.OIDCAUTH || authMode === AuthMode.FULLAUTH) {
        const oidcId = getCurrentOidcId(req.currentUser);
        response = await objectService.fetchAllForUser(oidcId);
      }
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },

  /** List all versions of the object */
  async listObjectVersion(req, res, next) {
    try {
      const data = {
        filePath: getPath(req.params.objId)
      };

      const response = await storageService.listObjectVersion(data);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Reads via streaming or returns a presigned URL for the object */
  async readObject(req, res, next) {
    try {
      const data = {
        filePath: getPath(req.params.objId),
        versionId: req.query.versionId ? req.query.versionId.toString() : undefined
      };

      // Download through service
      if (req.query.download) {
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
        const response = await storageService.readSignedUrl(data);
        res.status(302).set('Location', response).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Creates an updated version of the object via streaming */
  async updateObject(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers, limits: { files: 1 } });
      const oidcId = getCurrentOidcId(req.currentUser);
      let object = undefined;

      bb.on('file', (name, stream, info) => {
        const objId = req.params.objId;
        const data = {
          id: objId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename
          // TODO: Implement metadata and tag support - request shape TBD
          // metadata: { foo: 'bar', baz: 'bam' }
          // tags: { foo: 'bar', baz: 'bam' }
        };
        object = {
          data: data,
          dbResponse: objectService.update({ ...data, oidcId, path: getPath(objId) }),
          s3Response: storageService.putObject({ ...data, stream })
        };
      });
      bb.on('close', async () => {
        const result = {
          ...object.data,
          ...await object.dbResponse,
          ...await object.s3Response
        };
        res.status(200).json(result);
      });

      req.pipe(bb);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Sets the public flag of an object */
  async togglePublic(req, res, next) {
    try {
      const oidcId = getCurrentOidcId(req.currentUser, SYSTEM_USER);
      const data = {
        id: req.params.objId,
        public: req.body.public,
        updatedBy: oidcId
      };

      const response = await objectService.update(data);

      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },
};

module.exports = controller;
