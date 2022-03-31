const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');

class Permission extends Timestamps(Model) {
  static get tableName() {
    return 'permission';
  }

  static get idColumn() {
    return 'permCode';
  }

  static get relationMappings() {
    const ObjectPermission = require('./objectPermission');

    return {
      identityProvider: {
        relation: Model.BelongsToOneRelation,
        modelClass: ObjectPermission,
        join: {
          from: 'permission.permCode',
          to: 'object_permission.permCode'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterActive(query, value) {
        if (value !== undefined) query.where('active', value);
      },
      orderDefault(builder) {
        builder.orderByRaw('lower("permission"."permCode")');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['permCode'],
      properties: {
        permCode: { type: 'string', minLength: 1, maxLength: 255 },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }

}

module.exports = Permission;
