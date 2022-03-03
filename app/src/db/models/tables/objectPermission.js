const { Model } = require('objection');
const { Timestamps } = require('../mixins');
const stamps = require('../jsonSchema').stamps;

class ObjectPermission extends Timestamps(Model) {
  static get tableName() {
    return 'object_permission';
  }

  static get modifiers() {
    return {
      filterOidcId(query, value) {
        if (value) {
          query.where('oidcId', value);
        }
      },
      filterObjectId(query, value) {
        if (value) {
          query.where('objectId', value);
        }
      },
      filterCodes(query, value) {
        if (value && Array.isArray(value) && value.length) {
          query.where('code', value);
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'oidcId', 'objectId', 'code'],
      properties: {
        id: { type: 'string' },
        oidcId: { type: 'string' },
        objectId: { type: 'string' },
        code: { type: 'string' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectPermission;
