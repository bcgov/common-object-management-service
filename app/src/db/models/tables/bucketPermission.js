const { Model } = require('objection');

const { Permissions } = require('../../../components/constants');
const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

class BucketPermission extends Timestamps(Model) {
  static get tableName() {
    return 'bucket_permission';
  }

  static get relationMappings() {
    const Bucket = require('./bucket');
    const Permission = require('./permission');
    const User = require('./user');

    return {
      bucket: {
        relation: Model.HasOneRelation,
        modelClass: Bucket,
        join: {
          from: 'bucket_permission.bucketId',
          to: 'bucket.bucketId'
        }
      },
      permission: {
        relation: Model.HasOneRelation,
        modelClass: Permission,
        join: {
          from: 'bucket_permission.permCode',
          to: 'permission.permCode'
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'bucket_permission.userId',
          to: 'user.userId'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterUserId(query, value) {
        filterOneOrMany(query, value, 'userId');
      },
      filterBucketId(query, value) {
        filterOneOrMany(query, value, 'bucketId');
      },
      filterPermissionCode(query, value) {
        filterOneOrMany(query, value, 'permCode');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'userId', 'bucketId', 'permCode'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        bucketId: { type: 'string', format: 'uuid' },
        permCode: { type: 'string', enum: Object.values(Permissions) },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = BucketPermission;
