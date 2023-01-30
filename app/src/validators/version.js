const { validate, Joi } = require('express-validation');
const { scheme, type } = require('./common');


const schema = {
  fetchMetadata: {
    headers: type.metadata(),
    query: Joi.object({
      versionId: scheme.guid.required(),
    })
  },

  fetchTags: {
    query: Joi.object({
      versionId: scheme.guid.required(),
      tagset: type.tagset(),
    })
  },
};

const validator = {
  fetchMetadata: validate(schema.fetchMetadata, { statusCode: 422 }),
  fetchTags: validate(schema.fetchTags, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
