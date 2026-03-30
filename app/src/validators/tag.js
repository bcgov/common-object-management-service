const Joi = require('joi');

// const { type } = require('./common');
const { validate } = require('../middleware/validation');


const schema = {
  searchTags: {
    query: Joi.object({
      tagset: Joi.any(),
      // TODO: fix our tagset type
      // tagset: type.tagset(),
    })
  }
};

const validator = {
  searchTags: validate(schema.searchTags)
};

module.exports = validator;
module.exports.schema = schema;
