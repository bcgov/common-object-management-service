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
    const ObjectPermission = require('./objectPermission');
    const Version = require('./version');

    return {
      filterIds(query, value) {
        filterOneOrMany(query, value, 'id');
      },
      filterPath(query, value) {
        filterILike(query, value, 'path');
      },
      filterPublic(query, value) {
        if (value !== undefined) query.where('public', value);
      },
      filterActive(query, value) {
        if (value !== undefined) query.where('active', value);
      },
      filterUserId(query, value) {
        if (value) {
          query.whereIn('id', ObjectPermission.query()
            .distinct('objectId')
            .where('userId', value));
        }
      },
      filterMimeType(query, value) {
        if (value) {
          query.whereIn('id', Version.query()
            .distinct('objectId')
            .where('mimeType', 'ilike', `%${value}%`));
        }
      },
      filterName(query, value) {
        if (value) {
          query.whereIn('id', Version.query()
            .distinct('version.objectId')
            .joinRelated('metadata')
            .where('value', 'ilike', `%${value}%`)
            .andWhere('key', 'name'));
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
