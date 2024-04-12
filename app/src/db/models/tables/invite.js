const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');

class ObjectModel extends Timestamps(Model) {
  static get tableName() {
    return 'invite';
  }

  static get idColumn() {
    return 'token';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['token', 'resource', 'type'],
      properties: {
        token: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email', nullable: true },
        resource: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['bucketId', 'objectId'] },
        expiresAt: { type: 'string', format: 'date-time' },
        permissionsCode: { type: 'array', items: { type: 'string' } },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
