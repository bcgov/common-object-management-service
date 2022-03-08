const { Model } = require('objection');
const { Timestamps } = require('../mixins');
const stamps = require('../jsonSchema').stamps;

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
          from: 'object_permission.oidcId',
          to: 'user.oidcId'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterOidcId(query, value) {
        if (value) {
          query.where('oidcId', value);
        }
      },
      filterObjectId(query, value) {
        if (value) {
          query.where('objectId', value);
        }
      },
      filterPermissionCodes(query, value) {
        if (value && Array.isArray(value) && value.length) {
          query.where('permCode', value);
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'oidcId', 'objectId', 'permCode'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        oidcId: { type: 'string', maxLength: 255 },
        objectId: { type: 'string', maxLength: 255 },
        permCode: { type: 'string' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectPermission;
