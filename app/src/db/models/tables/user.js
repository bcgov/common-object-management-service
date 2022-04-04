const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

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

  static get modifiers() {
    return {
      filterUserId(query, value) {
        filterOneOrMany(query, value, 'userId');
      },
      filterIdentityId(query, value) {
        filterOneOrMany(query, value, 'identityId');
      },
      filterIdp(query, value) {
        filterOneOrMany(query, value, 'idp');
      },
      filterUsername(query, value) {
        filterILike(query, value, 'username');
      },
      filterEmail(query, value) {
        filterILike(query, value, 'email');
      },
      filterFirstName(query, value) {
        filterILike(query, value, 'firstName');
      },
      filterFullName(query, value) {
        filterILike(query, value, 'fullName');
      },
      filterLastName(query, value) {
        filterILike(query, value, 'lastName');
      },
      filterActive(query, value) {
        if (value !== undefined) query.where('active', value);
      },
      /** General OR search across multiple fields */
      filterSearch(query, value) {
        // Must be written as subquery function to force parentheses grouping
        if (value) {
          query.where(subquery => {
            subquery.where('username', 'ilike', `%${value}%`)
              .orWhere('email', 'ilike', `%${value}%`)
              .orWhere('fullName', 'ilike', `%${value}%`);
          });
        }
      },
      orderLastFirstAscending(builder) {
        builder.orderByRaw('lower("lastName"), lower("firstName")');
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
