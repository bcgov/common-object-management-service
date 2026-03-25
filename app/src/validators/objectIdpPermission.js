const Joi = require('joi');

const { scheme, type } = require('./common');
const { Permissions } = require('../components/constants');
const { validate } = require('../middleware/validation');

const schema = {
  searchPermissions: {
    query: Joi.object({
      bucketId: scheme.guid,
      bucketPerms: type.truthy,
      objectId: scheme.guid,
      permCode: scheme.permCode,
      idp: Joi.alternatives()
        .conditional('bucketPerms', {
          is: true,
          then: Joi.string()
            .required()
            .messages({
              'string': 'One idp required when `bucketPerms=true`',
            }),
          otherwise: scheme.string
        })
    })
  },

  listPermissions: {
    params: Joi.object({
      objectId: scheme.guid
    }),
    query: Joi.object({
      idp: scheme.string,
      permCode: scheme.permCode
    })
  },

  addPermissions: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    body: Joi.array().items(
      Joi.object().keys({
        idp: scheme.string.required(),
        permCode: Joi.string().required().valid(...Object.values(Permissions)),
      }).required()
    ).required(),
    query: Joi.object({
    })
  },

  removePermissions: {
    params: Joi.object({
      objectId: type.uuidv4
    }),
    query: Joi.object({
      idp: scheme.string,
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
