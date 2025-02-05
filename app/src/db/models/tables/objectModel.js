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
      filterVersionAttributes(query, mimeType, deleteMarker, isLatest, versionId, s3VersionId) {
        query
          .withGraphJoined('version')
          .leftJoinRelated('version')
          .modify(query => {
            if (mimeType) {
              query.where('version.mimeType', 'ilike', `%${mimeType}%`);
            }
            if (deleteMarker !== undefined) {
              query.where('version.deleteMarker', deleteMarker);
            }
            if (isLatest !== undefined) {
              query.where('version.isLatest', isLatest);
            }
            filterOneOrMany(query, versionId, 'version.id');
            filterOneOrMany(query, s3VersionId, 'version.s3VersionId');
          });
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
            .leftJoinRelated('version')
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
            // withGraphFetched keep joining using default 'left join' operation,
            // to fix default behavior we are adding extra joinOperation which seems to be working with
            // corresponding JoinRelated
            .withGraphFetched('[objectPermission, bucketPermission]', { joinOperation: 'fullOuterJoinRelated' })
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
        } else {
          query.withGraphFetched('objectPermission');
        }
      },
      pagination(query, page, limit) {
        if (page && limit) query.page(page - 1, limit);
      },
      sortOrder(query, column, order = 'asc') {
        if (column) query.orderBy(column, order);
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'path'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        path: { type: 'string', minLength: 1, maxLength: 1024 },
        public: { type: 'boolean' },
        active: { type: 'boolean' },
        bucketId: { type: 'string', format: 'uuid', nullable: true },
        name: { type: 'string', maxLength: 1024 },
        lastSyncedDate: { type: ['string', 'null'], format: 'date-time' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
