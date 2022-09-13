const { Model } = require('objection');

class Metadata extends Model {
  static get tableName() {
    return 'metadata';
  }

  static get relationMappings() {
    const Version = require('./version');
    const VersionMetadata = require('./versionMetadata');

    return {
      version: {
        relation: Model.ManyToManyRelation,
        modelClass: Version,
        join: {
          from: 'metadata.id',
          through: {
            from: 'version_metadata.metadataId',
            to: 'version_metadata.versionId'
          },
          to: 'version.id'
        }
      },
      versionMetadata: {
        relation: Model.HasManyRelation,
        modelClass: VersionMetadata,
        join: {
          from: 'metadata.id',
          to: 'version_metadata.metadataId'
        }
      },
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['key', 'value'],
      properties: {
        id: { type: 'integer' },
        key: { type: 'string', minLength: 1, maxLength: 255 },
        value: { type: 'string', minLength: 1, maxLength: 255 }
      },
      additionalProperties: false
    };
  }
}

module.exports = Metadata;
