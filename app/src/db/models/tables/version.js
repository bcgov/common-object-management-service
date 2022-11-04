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
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'objectId');
      },
      filterMimeType(query, value) {
        filterILike(query, value, 'mimeType');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['objectId', 'mimeType'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        versionId: { type: ['string', 'null'], maxLength: 1024 },
        objectId:{ type: 'string', minLength: 1, maxLength: 255 },
        mimeType: { type: 'string', maxLength: 255 },
        deleteMarker: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Version;
