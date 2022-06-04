const { validate, Joi } = require('express-validation');

const truthyModel = Joi.boolean()
  .truthy('true', 1, '1', 't', 'yes', 'y', 'false', 0, '0', 'f', 'no', 'n');

const schema = {
  searchUsers: {
    query: Joi.object({
      userId: Joi.alternatives().try(
        Joi.array().items(Joi.string().guid({
          version: 'uuidv4'
        })),
        Joi.string().guid({
          version: 'uuidv4'
        })
      ),
      identityId: Joi.alternatives().try(
        Joi.array().items(Joi.string().guid({
          version: 'uuidv4'
        })),
        Joi.string().guid({
          version: 'uuidv4'
        })
      ),
      idp: Joi.alternatives().try(
        Joi.array().items(Joi.string().max(255)),
        Joi.string().max(255)
      ),
      username: Joi.string().alphanum().max(255),
      email: Joi.string().max(255).email(),
      firstName: Joi.string().alphanum().max(255),
      fullName: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      lastName: Joi.string().alphanum().max(255),
      active: truthyModel,
      search: Joi.string()
    }).min(1)
  },

  listIdps: {
    query: Joi.object({
      active: truthyModel
    })
  }
};

const validator = {
  searchUsers: validate(schema.searchUsers, { statusCode: 422 }),
  listIdps: validate(schema.listIdps, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
