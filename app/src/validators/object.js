const { validate, Joi } = require('express-validation');

const { scheme, type } = require('./common');
const { DownloadMode } = require('../components/constants');

const schema = {
  addMetadata: {
    headers: type.metadata,
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
      tagset: type.tagset
    })
  },

  createObjects: {
    headers: type.metadata,
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset
    })
  },

  deleteMetadata: {
    headers: type.metadata,
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
      tagset: type.tagset,
    })
  },

  headObject: {
    params: Joi.object({
      objId: type.uuidv4
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
    headers: type.metadata,
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
      tagset: type.tagset,
    })
  },

  searchObjects: {
    headers: type.metadata,
    query: Joi.object({
      objId: scheme.guid,
      name: Joi.string(),
      path: Joi.string().max(1024),
      mimeType: Joi.string().max(255),
      tagset: type.tagset,
      public: type.truthy,
      active: type.truthy
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
    headers: type.metadata,
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset,
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
