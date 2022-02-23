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

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['oidcId', 'username'],
      properties: {
        oidcId: { type: 'string' },
        idp: { type: 'string' },
        firstName: { type: 'string' },
        fullName: { type: 'string' },
        lastName: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string' },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = User;
