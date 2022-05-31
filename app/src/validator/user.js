const { validate, Joi } = require('express-validation');

const schema = {
  searchUsers: {
    query: Joi.object({
      userId: Joi.array().items(Joi.string().guid({
        version: 'uuidv4'
      })),
      identityId: Joi.array().items(Joi.string().guid({
        version: 'uuidv4'
      })),
      idp: Joi.array().items(Joi.string()),
      username: Joi.string(),
      email: Joi.string().email(),
      firstName: Joi.string(),
      fullName: Joi.string(),
      lastName: Joi.string(),
      active: Joi.boolean(),
      search: Joi.string()
    }).min(1)
  },

  listIdps: {
    query: Joi.object({
      active: Joi.boolean(),
    })
  }
};

const validator = {
  searchUsers: validate(schema.searchUsers, { statusCode: 422 }),
  listIdps: validate( schema.listIdps, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
