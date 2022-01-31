const stamps = require('../stamps');
const uuid = require('uuid');

const CREATED_BY = uuid.NIL;

exports.up = function (knex) {
  return Promise.resolve()

    // Create user table and add a dummy system user (to link migration CreatedBy stamps)
    .then(() => knex.schema.createTable('oidc_user', table => {
      table.string('oidcId').primary();
      table.string('firstName');
      table.string('fullName');
      table.string('lastName');
      table.string('username').notNullable().index();
      table.string('email').index();
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))
    .then(() => {
      const items = [
        {
          oidcId: CREATED_BY,
          username: 'System',
          active: false
        },
      ];
      return knex('oidc_user').insert(items);
    })
    .then(() => knex.schema.createTable('identity_provider', table => {
      table.string('code').primary();
      table.string('display').notNullable();
      table.string('idpAlias');
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))
    // add the idp fk for user (user needs to be created first for stamp fks)
    .then(() => knex.schema.alterTable('oidc_user', table => {
      table.string('idp').references('code').inTable('identity_provider').after('oidcId');
    }))


    // Add the rest of the tables
    .then(() => knex.schema.createTable('permission', table => {
      table.string('code').primary();
      table.string('display').notNullable();
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))
    .then(() => knex.schema.createTable('object', table => {
      table.uuid('id').primary();
      table.string('originalName', 1024).notNullable();
      table.string('path', 1024).notNullable();
      table.string('mimeType').notNullable();
      table.string('uploaderOidcId').references('oidcId').inTable('oidc_user');
      table.boolean('public').notNullable().defaultTo(false);
      stamps(knex, table);
    }))
    .then(() => knex.schema.createTable('object_permission', table => {
      table.uuid('id').primary();
      table.string('oidcId').references('oidcId').inTable('oidc_user').notNullable();
      table.uuid('objectId').references('id').inTable('object').notNullable();
      table.string('code').references('code').inTable('permission').notNullable();
      stamps(knex, table);
    }))

    // Populate Data
    .then(() => {
      const items = [
        {
          createdBy: CREATED_BY,
          code: 'READ',
          display: 'Read',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'WRITE',
          display: 'Write',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'MANAGE',
          display: 'Manage',
          active: true
        },
      ];
      return knex('permission').insert(items);
    })
    .then(() => {
      const items = [
        {
          createdBy: CREATED_BY,
          code: 'idir',
          display: 'IDIR',
          idpAlias: 'idir',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'bceid-basic',
          display: 'Basic BCeID',
          idpAlias: 'bceid-basic',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'bceid-business',
          display: 'Business BCeID',
          idpAlias: 'bceid-business',
          active: true
        },
      ];
      return knex('identity_provider').insert(items);
    });
};

exports.down = function (knex) {
  return Promise.resolve()
    .then(() => knex.schema.dropTableIfExists('object_permission'))
    .then(() => knex.schema.dropTableIfExists('object'))
    .then(() => knex.schema.dropTableIfExists('permission'))
    .then(() => knex.schema.alterTable('oidc_user', table => {
      table.dropColumn('idp');
    }))
    .then(() => knex.schema.dropTableIfExists('identity_provider'))
    .then(() => knex.schema.dropTableIfExists('oidc_user'));
};
