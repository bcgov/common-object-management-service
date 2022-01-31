const { Model } = require('objection');
const { Timestamps } = require('../mixins');
const stamps = require('../jsonSchema').stamps;

class Object extends Timestamps(Model) {
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
        id: { type: 'string' },
        originalName: { type: 'string', minLength: 1, maxLength: 1024 },
        path: { type: 'string', minLength: 1, maxLength: 1024 },
        mimeType: { type: 'string' },
        uploaderOidcId: { type: 'string' },
        public: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Object;
