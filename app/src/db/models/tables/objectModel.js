const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

// The table is "object" but Object is a bit of a reserved word :)
class ObjectModel extends Timestamps(Model) {
  static get tableName() {
    return 'object';
  }

  static get relationMappings() {
    const Bucket = require('./bucket');
    const ObjectPermission = require('./objectPermission');
    const BucketPermission = require('./bucketPermission');
    const Version = require('./version');

    return {
      bucket: {
        relation: Model.HasOneRelation,
        modelClass: Bucket,
        join: {
          from: 'object.bucketId',
          to: 'bucket.bucketId'
        }
      },
      objectPermission: {
        relation: Model.HasManyRelation,
        modelClass: ObjectPermission,
        join: {
          from: 'object.id',
          to: 'object_permission.objectId'
        }
      },
      version: {
        relation: Model.HasManyRelation,
        modelClass: Version,
        join: {
          from: 'object.id',
          to: 'version.objectId',
        }
      },
      bucketPermission: {
        relation: Model.HasManyRelation,
        modelClass: BucketPermission,
        join: {
          from: 'object.bucketId',
          to: 'bucket_permission.bucketId'
        }
      }
    };
  }

  static get modifiers() {
    const Version = require('./version');

    return {
      filterIds(query, value) {
        filterOneOrMany(query, value, 'object.id');
      },
      filterBucketIds(query, value) {
        if (value === null) {
          query.whereNull('object.bucketId');
        } else {
          filterOneOrMany(query, value, 'object.bucketId');
        }
      },
      filterName(query, value) {
        filterILike(query, value, 'object.name');
      },
      filterPath(query, value) {
        filterILike(query, value, 'object.path');
      },
      filterPublic(query, value) {
        if (value !== undefined) query.where('object.public', value);
      },
      filterActive(query, value) {
        if (value !== undefined) query.where('object.active', value);
      },
      filterMimeType(query, value) {
        if (value) {
          query
            .withGraphJoined('version')
            .whereIn('version.id', builder => {
              builder.select('version.id')
                .where('version.mimeType', 'ilike', `%${value}%`);
            });
        }
      },
      filterDeleteMarker(query, value) {
        if (value !== undefined) {
          query
            .withGraphJoined('version')
            .where('version.deleteMarker', value);
        }
      },
      filterLatest(query, value) {
        if (value !== undefined) {

          query.withGraphJoined('version');
          if (value) {
            // join on version where isLatest = true
            query.modifyGraph('version', builder => {
              builder
                .select('version.*')
                .where('version.isLatest', true);
            });
          } else {
            // join on ALL versions where isLatest = false
            const subquery = Version.query()
              .select('version.id')
              .where('version.isLatest', false);
            query.whereIn('version.id', builder => {
              builder.intersect(subquery);
            });
          }
        }
      },
      filterMetadataTag(query, value) {
        const subqueries = [];

        if (value.metadata && Object.keys(value.metadata).length) {
          Object.entries(value.metadata).forEach(([key, val]) => {
            const q = Version.query()
              .select('version.id')
              .joinRelated('metadata')
              .where('metadata.key', key);
            if (val.length) q.where('metadata.value', val);
            subqueries.push(q);
          });
        }

        if (value.tag && Object.keys(value.tag).length) {
          Object.entries(value.tag).forEach(([key, val]) => {
            const q = Version.query()
              .select('version.id')
              .joinRelated('tag')
              .where('tag.key', key);
            if (val.length) q.where('tag.value', val);
            subqueries.push(q);
          });
        }

        if (subqueries.length) {
          query
            .withGraphJoined('version')
            .whereIn('version.id', builder => {
              builder.intersect(subqueries);
            });
        }
      },
      findPath(query, value) {
        if (value) query.where('object.path', value);
      },
      hasPermission(query, userId, permCode) {
        if (userId && permCode) {
          query
            .fullOuterJoinRelated('[objectPermission, bucketPermission]')
            // wrap in WHERE to make contained clauses exclusive of root query
            .where(query => {
              query
                .where(query => {
                  query
                    .where({
                      'objectPermission.permCode': permCode,
                      'objectPermission.userId': userId
                    });
                })
                .orWhere(query => {
                  query
                    .where({
                      'bucketPermission.permCode': permCode,
                      'bucketPermission.userId': userId
                    });
                });
            });
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'path'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        path: { type: 'string', minLength: 1, maxLength: 1024 },
        public: { type: 'boolean' },
        active: { type: 'boolean' },
        bucketId: { type: 'string', maxLength: 255, nullable: true },
        name: { type: 'string', maxLength: 1024 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
