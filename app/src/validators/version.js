const { validate, Joi } = require('express-validation');
const config = require('config');

const { scheme, type } = require('./common');


const schema = {
  fetchMetadata: {
    headers: type.metadata(),
    query: Joi.object((() => {
      const query = {
        s3VersionId: scheme.string
      };
      if (config.has('db.enabled')) {
        query.versionId = scheme.guid;
      }
      return query;
    })())
      .nand('s3VersionId', 'versionId')
  },

  fetchTags: {
    query: Joi.object((() => {
      const query = {
        tagset: type.tagset(),
        s3VersionId: scheme.string
      };
      if (config.has('db.enabled')) {
        query.versionId = scheme.guid;
      }
      return query;
    })())
      .nand('s3VersionId', 'versionId')
  }
};

const validator = {
  fetchMetadata: validate(schema.fetchMetadata, { statusCode: 422 }),
  fetchTags: validate(schema.fetchTags, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
