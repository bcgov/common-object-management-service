const { Model } = require('objection');
const { Timestamps } = require('../mixins');
const stamps = require('../jsonSchema').stamps;

class OidcUser extends Timestamps(Model) {
  static get tableName() {
    return 'oidc_user';
  }

  static get relationMappings() {
    const ObjectPermission = require('./objectPermission');

    return {
      objectPermission: {
        relation: Model.HasManyRelation,
        modelClass: ObjectPermission,
        join: {
          from: 'object.id',
          to: 'object_permission.objectId'
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['oidcId', 'idp', 'username', 'mimeType'],
      properties: {
        oidcId: { type: 'string' },
        idp: { type: 'string' },
        firstName: { type: 'string' },
        fullName: { type: 'string' },
        lastName: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'email' },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = OidcUser;
