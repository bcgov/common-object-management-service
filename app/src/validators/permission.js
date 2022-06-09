const { validate, Joi } = require('express-validation');
const { uuidv4, uuidv4MultiModel, permCodeMultiModel } = require('./common');
const { Permissions } = require('../components/constants');

const schema = {
  searchPermissions: {
    query: Joi.object({
      userId: uuidv4MultiModel,
      objId: uuidv4MultiModel,
      permCode: permCodeMultiModel
    }).min(1)
  },

  listPermissions: {
    params: Joi.object({
      objId: uuidv4MultiModel
    }),
    query: Joi.object({
      userId: uuidv4MultiModel,
      permCode: permCodeMultiModel
    })
  },

  addPermissions: {
    params: Joi.object({
      objId: uuidv4
    }),
    body: Joi.array().items(
      Joi.object().keys({
        userId: uuidv4.required(),
        permCode: Joi.string().max(255).required().valid(...Object.values(Permissions)),
      })
    ).required(),
  },

  removePermissions: {
    params: Joi.object({
      objId: uuidv4
    }),
    query: Joi.object({
      userId: uuidv4MultiModel,
      permCode: permCodeMultiModel,
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
