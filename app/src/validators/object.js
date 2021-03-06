const { validate, Joi } = require('express-validation');
const { scheme, type } = require('./common');

const schema = {
  deleteObject: {
    params: Joi.object({
      objId: type.uuidv4
    })
  },

  headObject: {
    params: Joi.object({
      objId: type.uuidv4
    }),
    query: Joi.object({
      versionId: type.alphanum
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
      versionId: type.alphanum,
      expiresIn: Joi.number(),
      download: type.truthy
    })
  },

  searchObjects: {
    query: Joi.object({
      objId: scheme.guid,
      name: Joi.string(),
      path: Joi.string().max(1024),
      mimeType: Joi.string().max(255),
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
};

const validator = {
  deleteObject: validate(schema.deleteObject, { statusCode: 422 }),
  headObject: validate(schema.headObject, { statusCode: 422 }),
  listObjectVersion: validate(schema.listObjectVersion, { statusCode: 422 }),
  readObject: validate(schema.readObject, { statusCode: 422 }),
  searchObjects: validate(schema.searchObjects, { statusCode: 422 }),
  togglePublic: validate(schema.togglePublic, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
