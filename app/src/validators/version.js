const Joi = require('joi');

const { scheme, type } = require('./common');
const { validate } = require('../middleware/validation');


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
  fetchMetadata: validate(schema.fetchMetadata),
  fetchTags: validate(schema.fetchTags)
};

module.exports = validator;
module.exports.schema = schema;
