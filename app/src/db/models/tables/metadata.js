const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');

class Metadata extends Timestamps(Model) {
  static get tableName() {
    return 'metadata';
  }

  static get relationMappings() {
    const Version = require('./version');

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
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['key', 'value'],
      properties: {
        id: { type: 'integer', maxLength: 4 },
        key: { type: 'string', maxLength: 2048 },
        value: { type: 'string', maxLength: 2048 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Metadata;
