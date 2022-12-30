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
    };
  }

  static get modifiers() {
    const Version = require('./version');

    return {
      filterIds(query, value) {
        filterOneOrMany(query, value, 'object.id');
      },
      filterBucketIds(query, value) {
        filterOneOrMany(query, value, 'object.bucketId');
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
      filterUserId(query, value) {
        if (value) {
          query
            .withGraphJoined('objectPermission')
            .whereIn('objectPermission.objectId', builder => {
              builder.distinct('objectPermission.objectId')
                .where('objectPermission.userId', value);
            });
        }
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
            .whereIn('version.id', builder => {
              builder.select('version.id')
                .where('version.deleteMarker', value);
            });
        }
      },
      filterLatest(query, value) {
        if (value !== undefined) {
          // if latest is true
          if(value){
            query
              .withGraphJoined('version')
              .whereIn('version.id', builder => {
                builder.select('version.id')
                  .orderBy('version.createdBy', 'DESC')
                  .limit(1);
              });
          }
          // if latest is false
          else{
            query
              .withGraphJoined('version')
              .whereNotIn('version.id', builder => {
                builder.select('version.id')
                  .orderBy('version.createdBy', 'DESC')
                  .limit(1);
              });
          }
        }
      },
      filterMetadataTag(query, value) {
        const subqueries = [];

        if (value.name) {
          const q = Version.query()
            .select('version.id')
            .joinRelated('metadata')
            .where('metadata.key', 'name')
            .where('metadata.value', 'ilike', `%${value.name}%`);
          subqueries.push(q);
        }

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
      }
      // TODO: consider chaining Version modifiers in a way that they are combined. Example:
      // Version.modifiers.filterDeleteMarker(query.joinRelated('version'), value);
      // Version.modifiers.filterLatest(query.joinRelated('version'), value);
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
        bucketId: { type: 'string', maxLength: 255 },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
