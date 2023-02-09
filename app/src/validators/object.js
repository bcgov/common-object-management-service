const { validate, Joi } = require('express-validation');
const config = require('config');

const { scheme, type } = require('./common');
const { DownloadMode } = require('../components/constants');

const schema = {
  addMetadata: {
    headers: type.metadata(1, 1).required(),
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string(),
    })
  },

  addTags: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string(),
      tagset: type.tagset(1, 1).required()
    })
  },

  // TODO: Make this schema definition unit-testable
  // bucketId property was undefined in unit test
  createObjects: {
    headers: type.metadata(),
    query: Joi.object((() => {
      const query = { tagset: type.tagset() };
      if (config.has('db.enabled')) query.bucketId = type.uuidv4;
      return query;
    })())
  },

  deleteMetadata: {
    headers: type.metadata(),
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string()
    })
  },

  deleteObject: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string()
    })
  },

  deleteTags: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string(),
      tagset: type.tagset(),
    })
  },

  fetchMetadata: {
    headers: type.metadata(),
    query: Joi.object({
      objId: scheme.guid.required()
    })
  },

  headObject: {
    params: Joi.object({
      objId: type.uuidv4.required()
    }),
    query: Joi.object({
      versionId: Joi.string(),
    })
  },

  listObjectVersion: {
    params: Joi.object({
      objId: type.uuidv4
    })
  },

  readObject: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string(),
      expiresIn: Joi.number(),
      download: Joi.string().valid(...Object.values(DownloadMode)),
    })
  },

  replaceMetadata: {
    headers: type.metadata(),
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string(),
    })
  },

  replaceTags: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: Joi.string(),
      tagset: type.tagset(),
    })
  },

  searchObjects: {
    headers: type.metadata(),
    query: Joi.object({
      objId: scheme.guid,
      bucketId: scheme.guid,
      name: Joi.string(),
      path: Joi.string().max(1024),
      mimeType: Joi.string().max(255),
      tagset: type.tagset(),
      public: type.truthy,
      active: type.truthy,
      deleteMarker: type.truthy,
      latest: type.truthy
    })
  },

  fetchTags: {
    query: Joi.object({
      objId: scheme.guid.required(),
      tagset: type.tagset(),
    })
  },

  togglePublic: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      public: type.truthy
    })
  },

  updateObject: {
    headers: type.metadata(),
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset(),
    })
  },
};

const validator = {
  addMetadata: validate(schema.addMetadata, { statusCode: 422 }),
  addTags: validate(schema.addTags, { statusCode: 422 }),
  createObjects: validate(schema.createObjects, { statusCode: 422 }),
  deleteMetadata: validate(schema.deleteMetadata, { statusCode: 422 }),
  deleteObject: validate(schema.deleteObject, { statusCode: 422 }),
  deleteTags: validate(schema.deleteTags, { statusCode: 422 }),
  fetchMetadata: validate(schema.fetchMetadata, { statusCode: 422 }),
  fetchTags: validate(schema.fetchTags, { statusCode: 422 }),
  headObject: validate(schema.headObject, { statusCode: 422 }),
  listObjectVersion: validate(schema.listObjectVersion, { statusCode: 422 }),
  readObject: validate(schema.readObject, { statusCode: 422 }),
  replaceMetadata: validate(schema.replaceMetadata, { statusCode: 422 }),
  replaceTags: validate(schema.replaceTags, { statusCode: 422 }),
  searchObjects: validate(schema.searchObjects, { statusCode: 422 }),
  togglePublic: validate(schema.togglePublic, { statusCode: 422 }),
  updateObject: validate(schema.updateObject, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
