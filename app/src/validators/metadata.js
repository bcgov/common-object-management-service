const { validate } = require('express-validation');

const { type } = require('./common');

const schema = {
  searchMetadata: {
    headers: type.metadata(),
  }
};

const validator = {
  searchMetadata: validate(schema.searchMetadata, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
