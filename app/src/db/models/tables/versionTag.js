const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

class VersionTag extends Timestamps(Model) {
  static get tableName() {
    return 'version_tag';
  }

  static get idColumn() {
    return ['versionId', 'tagId'];
  }

  static get relationMappings() {
    const Version = require('./version');
    const Tag = require('./tag');

    return {
      version: {
        relation: Model.HasOneRelation,
        modelClass: Version,
        join: {
          from: 'version_tag.versionId',
          to: 'version.id'
        }
      },
      tag: {
        relation: Model.HasOneRelation,
        modelClass: Tag,
        join: {
          from: 'version_tag.tagId',
          to: 'tag.id'
        }
      },
    };
  }

  static get modifiers() {
    return {
      filterTagId(query, value) {
        filterOneOrMany(query, value, 'tagId');
      },
      filterVersionId(query, value) {
        filterOneOrMany(query, value, 'versionId');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['tagId', 'versionId'],
      properties: {
        tagId: { type: 'integer' },
        versionId: { type: 'string', minLength: 1, maxLength: 255 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = VersionTag;
