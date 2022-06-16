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
          const subquery = Version.query()
            .distinct('objectId')
            .where('mimeType', 'ilike', `%${value}%`);
          query.whereIn('id', subquery);
        }
      },
      filterOriginalName(query, value) {
        if (value) {
          const subquery = Version.query()
            .distinct('objectId')
            .where('originalName', 'ilike', `%${value}%`);
          query.whereIn('id', subquery);
        }
      },
      filterDeleteMarker(query, value) {

        // if ?deleteMarker=latest
        if (value.toString() == 'latest') {
          console.log('latest');
          // where latest version is a delete marker
          // returns currently deleted objects
          query.whereIn('id', Version.query()
            .select('v.objectId')
            .from(Version.query()
              .select('objectId', 'deleteMarker')
              .distinctOn('objectId')
              .orderBy([
                { column: 'objectId' },
                { column: 'version.createdAt', order: 'desc' }
              ]).as('v')
            )
            .where('v.deleteMarker', true)
          );
        }

        // if ?deleteMarker=true
        if (value.toString() === 'true') {
          console.log('t');
          // where at least any one version is a delete marker
          // retunrs objects that were at any time deleted
          query.whereIn('id', Version.query()
            .distinct('objectId')
            .where('deleteMarker', value));
        }

        // if ?deleteMarker=false
        if (value.toString() === 'false') {
          console.log('f');
          // where has no delete markers
          // returns objects that were never deleted
          query.whereNotIn('id', Version.query()
            .distinct('objectId')
            .where('deleteMarker', true));
        }

        // if ?deleteMarker=notLatest
        if (value.toString() == 'notLatest') {
          // where latest version is not a delete marker
          // returns currently 'not-deleted' objects
          query.whereIn('id', Version.query()
            .select('v.objectId')
            .from(Version.query()
              .select('objectId', 'deleteMarker')
              .distinctOn('objectId')
              .orderBy([
                { column: 'objectId' },
                { column: 'version.createdAt', order: 'desc' }
              ]).as('v')
            )
            .where('v.deleteMarker', false)
          );
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
