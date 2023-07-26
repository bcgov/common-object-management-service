const { validate, Joi } = require('express-validation');

const { scheme, type } = require('./common');


const schema = {
  fetchMetadata: {
    headers: type.metadata(),
    query: Joi.object({
      s3VersionId: scheme.string,
      versionId: scheme.guid
    }).nand('s3VersionId', 'versionId')
  },

  fetchTags: {
    query: Joi.object({
      tagset: type.tagset(),
      s3VersionId: scheme.string,
      versionId: scheme.guid
    }).nand('s3VersionId', 'versionId')
  }
};

const validator = {
  fetchMetadata: validate(schema.fetchMetadata, { statusCode: 422 }),
  fetchTags: validate(schema.fetchTags, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
