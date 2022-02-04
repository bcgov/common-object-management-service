const busboy = require('busboy');
const config = require('config');
const { v4: uuidv4 } = require('uuid');

const errorToProblem = require('../errorToProblem');
const service = require('./service');

const SERVICE = 'ObjectStorage';

const controller = {
  /** Creates new objects */
  createObject(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers });
      const objects = [];

      bb.on('file', (name, stream, info) => {
        const data = {
          id: uuidv4(),
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename
          // TODO: Implement metadata and tag support - request shape TBD
          // metadata: { foo: 'bar', baz: 'bam' }
          // tags: { foo: 'bar', baz: 'bam' }
        };
        objects.push({
          data: data,
          response: service.putObject({ ...data, stream })
        });
      });
      bb.on('close', async () => {
        const result = await Promise.all(objects.map(async (object) => ({
          ...object.data,
          ...await object.response
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
        filePath: `${config.get('objectStorage.key')}/${req.params.objId}`,
      };

      await service.headObject(data); // First check if object exists
      const response = await service.deleteObject(data); // Attempt deletion operation
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** List all versions of the object */
  async listObjectVersion(req, res, next) {
    try {
      const data = {
        filePath: `${config.get('objectStorage.key')}/${req.params.objId}`,
      };

      await service.headObject(data); // First check if object exists
      const response = await service.listObjectVersion(data);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /** Reads via streaming or returns a presigned URL for the object */
  async readObject(req, res, next) {
    try {
      const data = {
        filePath: `${config.get('objectStorage.key')}/${req.params.objId}`,
        versionId: req.query.versionId ? req.query.versionId.toString() : undefined
      };

      await service.headObject(data); // First check if object exists

      // Download through service
      if (req.query.download) {
        const response = await service.readObject(data);

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
          res.status(200);
          response.Body.pipe(res); // Stream body content directly to response
        }
      }

      // Download via redirect
      else {
        const response = await service.readSignedUrl(data);
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
        filePath: `${config.get('objectStorage.key')}/${req.params.objId}`
      };

      await service.headObject(data); // First check if object exists

      const bb = busboy({ headers: req.headers, limits: { files: 1 } });
      let object = undefined;

      bb.on('file', (name, stream, info) => {
        const data = {
          id: req.params.objId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename,
          // TODO: Implement metadata and tag support - request shape TBD
          // metadata: { foo: 'bar', baz: 'bam' }
          // tags: { foo: 'bar', baz: 'bam' }
        };
        object = {
          data: data,
          response: service.putObject({ ...data, stream })
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
