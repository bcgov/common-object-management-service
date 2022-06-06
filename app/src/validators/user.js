const { validate, Joi } = require('express-validation');
const { alphanumModel, stringMultiModel, truthyModel, uuidv4MultiModel } = require('./common');


const schema = {
  searchUsers: {
    query: Joi.object({
      userId: uuidv4MultiModel,
      identityId: uuidv4MultiModel,
      idp: stringMultiModel,
      username: alphanumModel,
      email: Joi.string().max(255).email(),
      firstName: alphanumModel,
      fullName: Joi.string().pattern(/^[\w\-\s]+$/).max(255),
      lastName: alphanumModel,
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
