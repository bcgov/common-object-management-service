const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

class Version extends Timestamps(Model) {
  static get tableName() {
    return 'version';
  }

  static get relationMappings() {
    const ObjectModel = require('./objectModel');

    return {
      object: {
        relation: Model.HasOneRelation,
        modelClass: ObjectModel,
        join: {
          from: 'version.objectId',
          to: 'object.id'
        }
      },
    };
  }

  static get modifiers() {
    return {
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'objectId');
      },
      filterOriginalName(query, value) {
        filterILike(query, value, 'originalName');
      },
      filterMimeType(query, value) {
        filterILike(query, value, 'mimeType');
      },
      filterLatest(query, value) {
        if (value) {
          query
            // .where('versionId', '1655418336985');
            .select('objectId')
            .distinctOn('objectId')
            .orderBy([
              { column: 'objectId' },
              { column: 'version.createdAt', order: 'desc' }
            ]);
        }
      },
      filterDeleteMarker(query, value) {
        if (value !== undefined) {
          query.andWhere('deleteMarker', value);
        }
      },

    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['objectId', 'originalName', 'mimeType'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        versionId: { type: ['string', 'null'], maxLength: 1024 },
        objectId: { type: 'string', maxLength: 255 },
        originalName: { type: ['string', 'null'], minLength: 1, maxLength: 255 },
        mimeType: { type: ['string', 'null'], minLength: 1, maxLength: 255 },
        isLatest: { type: 'boolean' },
        deleteMarker: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = Version;
