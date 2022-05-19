const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

class Version extends Timestamps(Model) {
  static get tableName() {
    return 'version';
  }

  // if using composite key in version table
  // static get idColumn() {
  //   return ['id', 'objectId'];
  // }

  static get relationMappings() {
    const ObjectModel = require('./objectModel');
    const Metadata = require('./metadata');

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
      }
    };
  }

  static get modifiers() {
    return {
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'objectId');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'objectId'],
      properties: {
        id: { type: 'string', maxLength: 1024 },
        objectId: { type: 'string', maxLength: 255 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Version;
