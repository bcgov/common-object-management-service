const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');

// The table is "object" but Object is a bit of a reserved word :)
class ObjectModel extends Timestamps(Model) {
  static get tableName() {
    return 'object';
  }

  static get relationMappings() {
    const ObjectPermission = require('./objectPermission');

    return {
      objectPermission: {
        relation: Model.HasManyRelation,
        modelClass: ObjectPermission,
        join: {
          from: 'object.id',
          to: 'object_permission.objectId'
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'originalName', 'path', 'mimeType'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        originalName: { type: 'string', minLength: 1, maxLength: 255 },
        path: { type: 'string', minLength: 1, maxLength: 1024 },
        mimeType: { type: 'string', minLength: 1, maxLength: 255 },
        public: { type: 'boolean' },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
