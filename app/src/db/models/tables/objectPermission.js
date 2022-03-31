const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');


class ObjectPermission extends Timestamps(Model) {
  static get tableName() {
    return 'object_permission';
  }

  static get relationMappings() {
    const ObjectModel = require('./objectModel');
    const Permission = require('./permission');
    const User = require('./user');

    return {
      object: {
        relation: Model.HasOneRelation,
        modelClass: ObjectModel,
        join: {
          from: 'object_permission.objectId',
          to: 'object.id'
        }
      },
      permission: {
        relation: Model.HasOneRelation,
        modelClass: Permission,
        join: {
          from: 'object_permission.permission',
          to: 'permission.permission'
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'object_permission.userId',
          to: 'user.userId'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterUserId(query, value) {
        if (value) {
          if (Array.isArray(value) && value.length) {
            query.whereIn('userId', value);
          } else {
            query.where('userId', value);
          }
        }
      },
      filterObjectId(query, value) {
        if (value) {
          if (Array.isArray(value) && value.length) {
            query.whereIn('objectId', value);
          } else {
            query.where('objectId', value);
          }
        }
      },
      filterPermissionCode(query, value) {
        if (value) {
          if (Array.isArray(value) && value.length) {
            query.whereIn('permCode', value);
          } else {
            query.where('permCode', value);
          }
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'userId', 'objectId', 'permCode'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        userId: { type: 'string', maxLength: 255 },
        objectId: { type: 'string', maxLength: 255 },
        permCode: { type: 'string' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectPermission;
