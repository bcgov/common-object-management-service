const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');

class User extends Timestamps(Model) {
  static get tableName() {
    return 'user';
  }

  static get idColumn() {
    return 'userId';
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
          from: 'user.userId',
          to: 'object_permission.userId'
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'username'],
      properties: {
        userId: { type: 'string', maxLength: 255 },
        identityId: { type: 'string', maxLength: 255 },
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
