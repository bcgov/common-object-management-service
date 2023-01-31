const { validate, Joi } = require('express-validation');

const { type } = require('./common');

const schema = {
  searchTags: {
    query: Joi.object({
      tagset: type.tagset(),
    })
  }
};

const validator = {
  searchTags: validate(schema.searchTags, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
