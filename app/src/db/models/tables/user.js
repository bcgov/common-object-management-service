const { Model } = require('objection');
const { Timestamps } = require('../mixins');
const stamps = require('../jsonSchema').stamps;

class User extends Timestamps(Model) {
  static get tableName() {
    return 'user';
  }

  static get idColumn() {
    return 'oidcId';
  }

  static get relationMappings() {
    const IdentityProvider = require('./identityProvider');
    const ObjectPermission = require('./objectPermission');

    return {
      identityProvider: {
        relation: Model.HasOneRelation,
        modelClass: IdentityProvider,
        join: {
          from: 'user.idp',
          to: 'identity_provider.idp'
        }
      },
      objectPermission: {
        relation: Model.HasManyRelation,
        modelClass: ObjectPermission,
        join: {
          from: 'user.oidcId',
          to: 'object_permission.oidcId'
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['oidcId', 'username'],
      properties: {
        oidcId: { type: 'string', maxLength: 255 },
        idp: { type: 'string' },
        firstName: { type: 'string', maxLength: 255 },
        fullName: { type: 'string', maxLength: 255 },
        lastName: { type: 'string', maxLength: 255 },
        username: { type: 'string', maxLength: 255 },
        email: { type: 'string', maxLength: 255 },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = User;
