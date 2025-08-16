const Joi = require('joi');

const { scheme, type } = require('./common');
const { validate } = require('../middleware/validation');
const { Permissions } = require('../components/constants');

const schema = {
  createBucket: {
    body: Joi.object().keys({
      bucketName: Joi.string().max(255).required(),
      accessKeyId: Joi.string().max(255).required(),
      bucket: Joi.string().max(255).required(),
      endpoint: Joi.string().uri({ scheme: /https?/ }).max(255).required(),
      key: Joi.string().max(255).trim().strict(),
      secretAccessKey: Joi.string().max(255).required(),
      region: Joi.string().max(255),
      active: type.truthy,
      permCodes: Joi.array().items(...Object.values(Permissions))
    }).required(),
    params: Joi.object({
    }),
    query: Joi.object({
    })
  },

  createBucketChild: {
    body: Joi.object().keys({
      bucketName: Joi.string().max(255).required(),
      subKey: Joi.string().max(255).trim().strict().required()
    }).required(),
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    query: Joi.object({
    })
  },

  deleteBucket: {
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    query: Joi.object({
      recursive: type.truthy,
    })
  },

  headBucket: {
    params: Joi.object({
      bucketId: type.uuidv4.required()
    }),
    query: Joi.object({
    })
  },

  readBucket: {
    params: Joi.object({
      bucketId: type.uuidv4.required()
    }),
    query: Joi.object({
    })
  },

  searchBuckets: {
    query: Joi.object({
      bucketId: scheme.guid,
      bucketName: Joi.string().max(255),
      key: Joi.string().max(255),
      active: type.truthy
    })
  },

  syncBucket: {
    params: Joi.object({
      bucketId: type.uuidv4.required()
    }),
    query: Joi.object({
      recursive: type.truthy,
    })
  },

  togglePublic: {
    params: Joi.object({
      bucketId: type.uuidv4.required()
    }),
    query: Joi.object({
      public: type.truthy
    })
  },

  updateBucket: {
    body: Joi.object().keys({
      bucketName: Joi.string().max(255),
      accessKeyId: Joi.string().max(255),
      bucket: Joi.string().max(255),
      endpoint: Joi.string().uri({ scheme: /https?/ }).max(255),
      secretAccessKey: Joi.string().max(255),
      region: Joi.string().max(255),
      active: type.truthy
    }),
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    query: Joi.object({
    })
  },
};

const validator = {
  createBucket: validate(schema.createBucket),
  createBucketChild: validate(schema.createBucketChild),
  deleteBucket: validate(schema.deleteBucket),
  headBucket: validate(schema.headBucket),
  readBucket: validate(schema.readBucket),
  syncBucket: validate(schema.syncBucket),
  searchBuckets: validate(schema.searchBuckets),
  updateBucket: validate(schema.updateBucket),
  togglePublic: validate(schema.togglePublic),
};

module.exports = validator;
module.exports.schema = schema;
