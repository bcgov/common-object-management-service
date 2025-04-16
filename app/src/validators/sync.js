const Joi = require('joi');

const { scheme } = require('./common');
const { validate } = require('../middleware/validation');


const schema = {
  syncStatus: {
    query: Joi.object({
      bucketId: scheme.guid,
    })
  }
};

const validator = {
  syncStatus: validate(schema.syncStatus)
};

module.exports = validator;
module.exports.schema = schema;
