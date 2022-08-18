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
    const ObjectPermission = require('./objectPermission');
    const Version = require('./version');

    return {
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
      filterMetadata(query, name, metadata) {
        const subqueries = [];

        if (name) {
          subqueries.push(Version.query()
            .select('version.id')
            .joinRelated('metadata')
            .where('metadata.key', 'name')
            .where('metadata.value', 'ilike', `%${name}%`));
        }

        if (metadata && Object.keys(metadata).length) {
          Object.entries(metadata).forEach(([key, val]) => {
            const q = Version.query()
              .select('version.id')
              .joinRelated('metadata')
              .where('metadata.key', key);
            if (val.length) q.where('metadata.value', val);
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
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
