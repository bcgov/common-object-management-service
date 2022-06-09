const { validate, Joi } = require('express-validation');
const { scheme, type } = require('./common');


const schema = {
  searchUsers: {
    query: Joi.object({
      userId: scheme.guid,
      identityId: scheme.guid,
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
  searchUsers: validate(schema.searchUsers, { statusCode: 422 }),
  listIdps: validate(schema.listIdps, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
