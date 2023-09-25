const Joi = require('joi');

const { scheme, type } = require('./common');
const { validate } = require('../middleware/validation');

const schema = {
  searchUsers: {
    query: Joi.object({
      userId: scheme.guid,
      identityId: scheme.string,
      idp: scheme.string,
      username: type.alphanum,
      email: type.email,
      firstName: type.alphanum,
      fullName: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      lastName: type.alphanum,
      active: type.truthy,
      search: Joi.string()
    }).min(1)
  },

  listIdps: {
    query: Joi.object({
      active: type.truthy
    })
  }
};

const validator = {
  searchUsers: validate(schema.searchUsers),
  listIdps: validate(schema.listIdps)
};

module.exports = validator;
module.exports.schema = schema;
