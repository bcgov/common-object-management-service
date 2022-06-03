const { validate, Joi } = require('express-validation');

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
      username: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      email: Joi.string().max(255).email(),
      firstName: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      fullName: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      lastName: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      active: Joi.boolean()
        .truthy('true')
        .truthy(1)
        .truthy('1')
        .truthy('t')
        .truthy('yes')
        .truthy('y')
        // Telling Joi these negatives are considered valid options
        .truthy('false')
        .truthy(0)
        .truthy('0')
        .truthy('f')
        .truthy('no')
        .truthy('n'),
      search: Joi.string()
    }).min(1)
  },

  listIdps: {
    query: Joi.object({
      active: Joi.boolean()
        .truthy('true')
        .truthy(1)
        .truthy('1')
        .truthy('t')
        .truthy('yes')
        .truthy('y')
        // Telling Joi these negatives are considered valid options
        .truthy('false')
        .truthy(0)
        .truthy('0')
        .truthy('f')
        .truthy('no')
        .truthy('n')
    })
  }
};

const validator = {
  searchUsers: validate(schema.searchUsers, { statusCode: 422 }),
  listIdps: validate(schema.listIdps, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
