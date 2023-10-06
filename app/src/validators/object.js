const Joi = require('joi');

const { scheme, type } = require('./common');
const { DownloadMode } = require('../components/constants');
const { validate } = require('../middleware/validation');

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
      latest: type.truthy
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
  addMetadata: validate(schema.addMetadata),
  addTags: validate(schema.addTags),
  createObject: validate(schema.createObject),
  deleteMetadata: validate(schema.deleteMetadata),
  deleteObject: validate(schema.deleteObject),
  deleteTags: validate(schema.deleteTags),
  fetchMetadata: validate(schema.fetchMetadata),
  fetchTags: validate(schema.fetchTags),
  headObject: validate(schema.headObject),
  listObjectVersion: validate(schema.listObjectVersion),
  readObject: validate(schema.readObject),
  replaceMetadata: validate(schema.replaceMetadata),
  replaceTags: validate(schema.replaceTags),
  searchObjects: validate(schema.searchObjects),
  syncObject: validate(schema.syncObject),
  togglePublic: validate(schema.togglePublic),
  updateObject: validate(schema.updateObject)
};

module.exports = validator;
module.exports.schema = schema;
