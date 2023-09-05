const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

class Version extends Timestamps(Model) {
  static get tableName() {
    return 'version';
  }

  static get relationMappings() {
    const ObjectModel = require('./objectModel');
    const Metadata = require('./metadata');
    const Tag = require('./tag');

    return {
      object: {
        relation: Model.HasOneRelation,
        modelClass: ObjectModel,
        join: {
          from: 'version.objectId',
          to: 'object.id'
        }
      },

      metadata: {
        relation: Model.ManyToManyRelation,
        modelClass: Metadata,
        join: {
          from: 'version.id',
          through: {
            from: 'version_metadata.versionId',
            to: 'version_metadata.metadataId'
          },
          to: 'metadata.id'
        }
      },

      tag: {
        relation: Model.ManyToManyRelation,
        modelClass: Tag,
        join: {
          from: 'version.id',
          through: {
            from: 'version_tag.versionId',
            to: 'version_tag.tagId'
          },
          to: 'tag.id'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterDeleteMarker(query, value) {
        if (value !== undefined) query.where('version.deleteMarker', value);
      },
      filterETag(query, value) {
        if (value) query.where('version.etag', value);
      },
      filterId(query, value) {
        filterOneOrMany(query, value, 'version.id');
      },
      filterIsLatest(query, value) {
        if (value !== undefined) query.where('version.isLatest', value);
      },
      filterMimeType(query, value) {
        filterILike(query, value, 'version.mimeType');
      },
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'version.objectId');
      },
      filterS3VersionId(query, value) {
        filterOneOrMany(query, value, 'version.s3VersionId');
      },
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      // required: ['objectId'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        s3VersionId: { type: ['string', 'null'], maxLength: 1024 },
        objectId: { type: 'string', minLength: 1, maxLength: 255 },
        mimeType: { type: 'string', maxLength: 255 },
        deleteMarker: { type: 'boolean' },
        etag: { type: 'string', maxLength: 65536 },
        isLatest: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Version;
