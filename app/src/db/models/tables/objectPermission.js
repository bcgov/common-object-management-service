const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

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
          from: 'object_permission.permCode',
          to: 'permission.permCode'
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
      filterBucketId(query, value) {
        if (value) {
          query
            .select('object_permission.*')
            .joinRelated('object')
            .whereIn('object.bucketId', value);
        }
      },
      filterUserId(query, value) {
        filterOneOrMany(query, value, 'userId');
      },
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'objectId');
      },
      filterPermissionCode(query, value) {
        filterOneOrMany(query, value, 'permCode');
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
        permCode: { type: 'string', maxLength: 255 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectPermission;
