
const Joi = require('joi');

const { scheme, type } = require('./common');
const { Permissions } = require('../components/constants');
const { validate } = require('../middleware/validation');

const schema = {
  searchPermissions: {
    query: Joi.object({
      bucketId: scheme.guid,
      objectPerms: type.truthy,
      permCode: scheme.permCode,
      userId: Joi.alternatives()
        .conditional('objectPerms', {
          is: true,
          then: type.uuidv4
            .required()
            .messages({
              'string.guid': 'One userId required when `objectPerms=true`',
            }),
          otherwise: scheme.guid
        })
    })
  },

  listPermissions: {
    params: Joi.object({
      bucketId: scheme.guid
    }),
    query: Joi.object({
      userId: scheme.guid,
      permCode: scheme.permCode
    })
  },

  addPermissions: {
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    body: Joi.array().items(
      Joi.object().keys({
        userId: type.uuidv4.required(),
        permCode: Joi.string().required().valid(...Object.values(Permissions)),
      }).required()
    ).required(),
  },

  removePermissions: {
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    query: Joi.object({
      userId: scheme.guid,
      permCode: scheme.permCode,
    })
  }
};

const validator = {
  searchPermissions: validate(schema.searchPermissions),
  listPermissions: validate(schema.listPermissions),
  addPermissions: validate(schema.addPermissions),
  removePermissions: validate(schema.removePermissions)
};

module.exports = validator;
module.exports.schema = schema;
