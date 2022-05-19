const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

class VersionMetadata extends Timestamps(Model) {
  static get tableName() {
    return 'version_metadata';
  }

  static get relationMappings() {
    const Version = require('./version');
    const Metadata = require('./metadata');

    return {
      version: {
        relation: Model.HasOneRelation,
        modelClass: Version,
        join: {
          from: 'version_metadata.versionId',
          to: 'version.id'
        }
      },
      permission: {
        relation: Model.HasOneRelation,
        modelClass: Metadata,
        join: {
          from: 'version_metadata.metadataId',
          to: 'metadata.id'
        }
      },
    };
  }

  static get modifiers() {
    return {
      filterMetadataId(query, value) {
        filterOneOrMany(query, value, 'metadataId');
      },
      filterVersionId(query, value) {
        filterOneOrMany(query, value, 'versionId');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['metadataId', 'versionId'],
      properties: {
        metadataId: { type: 'integer' },
        versionId: { type: 'string', maxLength: 2048 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = VersionMetadata;
