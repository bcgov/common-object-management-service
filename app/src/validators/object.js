const { validate, Joi } = require('express-validation');

const { scheme, type } = require('./common');
const { DownloadMode } = require('../components/constants');

const schema = {
  addMetadata: {
    headers: type.metadata(),
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  addTags: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset(),
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  // TODO: Make this schema definition unit-testable
  // bucketId property was undefined in unit test
  createObject: {
    headers: type.metadata(),
    query: Joi.object({
      tagset: type.tagset(),
      bucketId: type.uuidv4
    })
  },

  deleteMetadata: {
    headers: type.metadata(),
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  deleteObject: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  deleteTags: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset(),
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  fetchMetadata: {
    headers: type.metadata(),
    query: Joi.object({
      bucketId: scheme.guid,
      objectId: scheme.guid
    })
  },

  headObject: {
    params: Joi.object({
      objectId: type.uuidv4.required()
    }),
    query: Joi.object({
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  listObjectVersion: {
    params: Joi.object({
      objectId: type.uuidv4
    })
  },

  readObject: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      expiresIn: Joi.number(),
      download: Joi.string().valid(...Object.values(DownloadMode)),
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  replaceMetadata: {
    headers: type.metadata(),
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  replaceTags: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset(),
      s3VersionId: Joi.string(),
      versionId: type.uuidv4
    }).nand('s3VersionId', 'versionId')
  },

  searchObjects: {
    headers: type.metadata(),
    query: Joi.object({
      objectId: scheme.guid,
      bucketId: scheme.guid,
      name: Joi.string(),
      path: Joi.string().max(1024),
      mimeType: Joi.string().max(255),
      tagset: type.tagset(),
      public: type.truthy,
      active: type.truthy,
      deleteMarker: type.truthy,
      latest: type.truthy,
    })
  },
  listObjects: {
    headers: type.metadata(),
    query: Joi.object({
      objectId: scheme.guid,
      bucketId: scheme.guid,
      name: Joi.string(),
      path: Joi.string().max(1024),
      mimeType: Joi.string().max(255),
      tagset: type.tagset(),
      public: type.truthy,
      active: type.truthy,
      deleteMarker: type.truthy,
      latest: type.truthy,
      sortName: Joi.string().max(4),
      sortId: Joi.string().max(4),
    })
  },
  fetchTags: {
    query: Joi.object({
      bucketId: scheme.guid,
      objectId: scheme.guid,
      tagset: type.tagset(),
    })
  },

  syncObject: {
    params: Joi.object({
      objectId: type.uuidv4.required()
    })
  },

  togglePublic: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      public: type.truthy
    })
  },

  updateObject: {
    headers: type.metadata(),
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      tagset: type.tagset(),
    })
  },
};

const validator = {
  addMetadata: validate(schema.addMetadata, { statusCode: 422 }),
  addTags: validate(schema.addTags, { statusCode: 422 }),
  createObject: validate(schema.createObject, { statusCode: 422 }),
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
  listObjects: validate(schema.listObjects, { statusCode: 422 }),
  syncObject: validate(schema.syncObject, { statusCode: 422 }),
  togglePublic: validate(schema.togglePublic, { statusCode: 422 }),
  updateObject: validate(schema.updateObject, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
