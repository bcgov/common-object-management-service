const { validate, Joi } = require('express-validation');
const { type } = require('./common');


const schema = {
  syncDefault: {
    query: Joi.object({
      full: type.truthy
    })
  }
};

const validator = {
  syncDefault: validate(schema.syncDefault, { statusCode: 422 })
};

module.exports = validator;
module.exports.schema = schema;
