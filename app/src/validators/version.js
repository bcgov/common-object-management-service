const { validate, Joi } = require('express-validation');
const { scheme, type } = require('./common');


const schema = {
  fetchMetadata: {
    headers: type.metadata(0),
    query: Joi.object({
      versionId: scheme.guid,
    })
  },
};

const validator = {
  fetchMetadata: validate(schema.fetchMetadata, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
