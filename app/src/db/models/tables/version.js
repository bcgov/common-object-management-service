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

    return {
      object: {
        relation: Model.HasOneRelation,
        modelClass: ObjectModel,
        join: {
          from: 'version.objectId',
          to: 'object.id'
        }
      },
    };
  }

  static get modifiers() {
    return {
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'objectId');
      },
      filterOriginalName(query, value) {
        filterILike(query, value, 'originalName');
      },
      filterMimeType(query, value) {
        filterILike(query, value, 'mimeType');
      },
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'versionId', 'objectId', 'originalName', 'mimeType'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        versionId: { type: 'string', maxLength: 1024 },
        objectId: { type: 'string', maxLength: 255 },
        originalName: { type: 'string', minLength: 1, maxLength: 255 },
        mimeType: { type: 'string', minLength: 1, maxLength: 255 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Version;
