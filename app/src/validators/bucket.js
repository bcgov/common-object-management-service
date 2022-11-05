const { validate, Joi } = require('express-validation');

const { scheme, type } = require('./common');
const { DownloadMode } = require('../components/constants');

const schema = {
  createBucket: {
    body: Joi.object().keys({
      bucketName: Joi.string().max(255).required(),
      accessKeyId: Joi.string().max(255).required(),
      bucket: Joi.string().max(255).required(),
      endpoint: Joi.string().max(255).required(),
      key: Joi.string().max(255).required(),
      secretAccessKey: Joi.string().max(255).required(),
      region: Joi.string().max(255),
      active: type.truthy
    }),
  },

  deleteBucket: {
    params: Joi.object({
      bucketId: type.uuidv4
    })
  },

  headBucket: {
    params: Joi.object({
      bucketId: type.uuidv4
    })
  },

  readBucket: {
    params: Joi.object({
      bucketId: type.uuidv4
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

  updateBucket: {
    body: Joi.object().keys({
      bucketName: Joi.string().max(255),
      accessKeyId: Joi.string().max(255),
      bucket: Joi.string().max(255),
      endpoint: Joi.string().max(255),
      key: Joi.string().max(255),
      secretAccessKey: Joi.string().max(255),
      region: Joi.string().max(255),
      active: type.truthy
    }),
    params: Joi.object({
      bucketId: type.uuidv4
    })
  },
};

const validator = {
  createBucket: validate(schema.createBucket, { statusCode: 422 }),
  deleteBucket: validate(schema.deleteBucket, { statusCode: 422 }),
  headBucket: validate(schema.headBucket, { statusCode: 422 }),
  readBucket: validate(schema.readBucket, { statusCode: 422 }),
  searchBuckets: validate(schema.searchBuckets, { statusCode: 422 }),
  updateBucket: validate(schema.updateBucket, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
