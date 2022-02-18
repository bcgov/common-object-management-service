const busboy = require('busboy');
const { v4: uuidv4 } = require('uuid');

const { AuthType } = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const { getPath } = require('../components/utils');
const { recordService, storageService } = require('../services');

const SERVICE = 'ObjectStorage';

const controller = {
  /** Creates new objects */
  createObject(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers });
      const objects = [];
      const oidcId = (req.currentUser && req.currentUser.authType === AuthType.BEARER)
        ? req.currentUser.tokenPayload.sub
        : undefined;

      bb.on('file', (name, stream, info) => {
        const newId = uuidv4();
        const data = {
          id: newId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename
          // TODO: Implement metadata and tag support - request shape TBD
          // metadata: { foo: 'bar', baz: 'bam' }
          // tags: { foo: 'bar', baz: 'bam' }
        };
        objects.push({
          data: data,
          dbResponse: recordService.create({ ...data, oidcId, path: getPath(newId) }),
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

      await storageService.headObject(data); // First check if object exists
      const response = await storageService.deleteObject(data); // Attempt deletion operation
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Returns object headers */
  async headObject(req, res, next) {
    try {
      throw new Error('Not Implemented');
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** List all user accessible objects */
  async listUserObject(req, res, next) {
    try {
      // TODO: Consider accepting oidcId as a query parameter
      // TODO: Add support for filtering by set of permissions
      const oidcId = (req.currentUser && req.currentUser.authType === AuthType.BEARER)
        ? req.currentUser.tokenPayload.sub
        : undefined;
      const response = await recordService.fetchAllForUser(oidcId);
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

      await storageService.headObject(data); // First check if object exists
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

      await storageService.headObject(data); // First check if object exists

      // Download through service
      if (req.query.download) {
        const response = await storageService.readObject(data);

        // Set Headers
        // TODO: Consider looking around for express-based header middleware
        if (response.Metadata) {
          Object.entries(response.Metadata).forEach(([key, value]) => {
            res.set(`x-amz-meta-${key}`, value);
          });
          if (response.Metadata.name) res.attachment(response.Metadata.name);
        }
        if (response.ContentType) res.set('Content-Type', response.ContentType);
        if (response.ETag) res.set('ETag', response.ETag);
        if (response.LastModified) res.set('Last-Modified', response.LastModified);

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
      const data = {
        filePath: getPath(req.params.objId)
      };

      await storageService.headObject(data); // First check if object exists

      const bb = busboy({ headers: req.headers, limits: { files: 1 } });
      let object = undefined;

      bb.on('file', (name, stream, info) => {
        const data = {
          id: req.params.objId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename
          // TODO: Implement metadata and tag support - request shape TBD
          // metadata: { foo: 'bar', baz: 'bam' }
          // tags: { foo: 'bar', baz: 'bam' }
        };
        object = {
          data: data,
          response: storageService.putObject({ ...data, stream })
        };
      });
      bb.on('close', async () => {
        const result = { ...object.data, ...await object.response };
        res.status(200).json(result);
      });

      req.pipe(bb);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },
};

module.exports = controller;
