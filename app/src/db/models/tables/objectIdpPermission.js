const { Model } = require('objection');

const { Permissions } = require('../../../components/constants');
const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

class ObjectIdpPermission extends Timestamps(Model) {
  static get tableName() {
    return 'object_idp_permission';
  }

  static get relationMappings() {
    const ObjectModel = require('./objectModel');
    const Permission = require('./permission');
    const IdentityProvider = require('./identityProvider');

    return {
      object: {
        relation: Model.HasOneRelation,
        modelClass: ObjectModel,
        join: {
          from: 'object_idp_permission.objectId',
          to: 'object.id'
        }
      },
      permission: {
        relation: Model.HasOneRelation,
        modelClass: Permission,
        join: {
          from: 'object_idp_permission.permCode',
          to: 'permission.permCode'
        }
      },
      identity_provider: {
        relation: Model.HasOneRelation,
        modelClass: IdentityProvider,
        join: {
          from: 'object_idp_permission.idp',
          to: 'identity_provider.idp'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterBucketId(query, value) {
        if (value) {
          query
            .select('object_idp_permission.*')
            .joinRelated('object')
            .whereIn('object.bucketId', value);
        }
      },
      filterIdp(query, value) {
        filterOneOrMany(query, value, 'idp');
      },
      filterObjectId(query, value) {
        filterOneOrMany(query, value, 'objectId');
      },
      filterPermissionCode(query, value) {
        filterOneOrMany(query, value, 'permCode');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'idp', 'objectId', 'permCode'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        idp: { type: 'string' },
        objectId: { type: 'string', format: 'uuid' },
        permCode: { type: 'string', enum: Object.values(Permissions) },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectIdpPermission;
