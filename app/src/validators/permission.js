const { validate, Joi } = require('express-validation');
const { uuidv4, uuidv4MultiModel, stringMultiModel } = require('./common');

const schema = {
  searchPermissions: {
    query: Joi.object({
      userId: uuidv4MultiModel,
      objId: uuidv4MultiModel,
      permCode: stringMultiModel
    }).min(1)
  },

  listPermissions: {
    query: Joi.object({
      userId: uuidv4MultiModel,
      objId: uuidv4MultiModel,
      permCode: stringMultiModel
    })
  },

  addPermissions: {
    params: Joi.object({
      objId: uuidv4
    }),
    body: Joi.array().items(
      Joi.object().keys({
        userId: Joi.string().guid({
          version: 'uuidv4'
        }).required(),
        permCode: Joi.string().max(255).required(),
      })
    ).required(),
  },

  removePermissions: {
    params: Joi.object({
      objId: uuidv4
    }),
    query: Joi.object({
      userId: uuidv4MultiModel,
      permCode: stringMultiModel,
    })
  },

};

const validator = {
  searchPermissions: validate(schema.searchPermissions, { statusCode: 422 }),
  listPermissions: validate(schema.listPermissions, { statusCode: 422 }),
  addPermissions: validate(schema.addPermissions, { statusCode: 422 }),
  removePermissions: validate(schema.removePermissions, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
