const { mixin, Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Encrypt, Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

class Bucket extends mixin(Model, [
  Encrypt({ fields: ['secretAccessKey'] }),
  Timestamps
]) {
  static get tableName() {
    return 'bucket';
  }

  static get idColumn() {
    return 'bucketId';
  }

  static get relationMappings() {
    const BucketPermission = require('./bucketPermission');
    const ObjectModel = require('./objectModel');

    return {
      bucketPermission: {
        relation: Model.HasManyRelation,
        modelClass: BucketPermission,
        join: {
          from: 'bucket.bucketId',
          to: 'bucket_permission.bucketId'
        }
      },
      object: {
        relation: Model.HasManyRelation,
        modelClass: ObjectModel,
        join: {
          from: 'bucket.bucketId',
          to: 'object.bucketId',
        }
      },
    };
  }

  static get modifiers() {
    return {
      filterBucketIds(query, value) {
        filterOneOrMany(query, value, 'bucket.bucketId');
      },
      filterBucketName(query, value) {
        filterILike(query, value, 'bucket.bucketName');
      },
      filterKey(query, value) {
        filterILike(query, value, 'bucket.key');
      },
      filterActive(query, value) {
        if (value !== undefined) query.where('bucket.active', value);
      },
      filterUserId(query, value) {
        if (value) {
          query
            .withGraphJoined('bucketPermission')
            .whereIn('bucketPermission.bucketId', builder => {
              builder.distinct('bucketPermission.bucketId')
                .where('bucketPermission.userId', value);
            });
        }
      },
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: [
        'bucketId',
        'bucketName',
        'accessKeyId',
        'bucket',
        'endpoint',
        'secretAccessKey'
      ],
      properties: {
        bucketId: { type: 'string', minLength: 1, maxLength: 255 },
        bucketName: { type: 'string', minLength: 1, maxLength: 255 },
        accessKeyId: { type: 'string', minLength: 1, maxLength: 255 },
        bucket: { type: 'string', minLength: 1, maxLength: 255 },
        endpoint: { type: 'string', minLength: 1, maxLength: 255 },
        key: { type: 'string', maxLength: 255 },
        secretAccessKey: { type: 'string', minLength: 1, maxLength: 255 },
        region: { type: 'string', maxLength: 255 },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Bucket;
