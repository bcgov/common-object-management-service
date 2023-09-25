const { type } = require('./common');
const { validate } = require('../middleware/validation');

const schema = {
  searchMetadata: {
    headers: type.metadata(),
  }
};

const validator = {
  searchMetadata: validate(schema.searchMetadata)
};

module.exports = validator;
module.exports.schema = schema;
