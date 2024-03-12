const stamps = require('../stamps');

exports.up = function (knex) {
  return Promise.resolve()
    // Create invite schema and invite table
    .then(() => knex.schema.raw('CREATE SCHEMA IF NOT EXISTS invite'))

    .then(() => knex.schema.withSchema('invite').createTable('invite', table => {
      table.uuid('token').primary();
      table.text('email');
      table.uuid('resource').notNullable();
      table.text('type').notNullable();
      table.timestamp('expiresAt', { useTz: true }).notNullable()
        // Defaults to one day ahead of current time
        .defaultTo(knex.raw('? + ?::INTERVAL', [knex.fn.now(), '1 day']));
      stamps(knex, table);
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop invite schema and invite table
    .then(() => knex.schema.withSchema('invite').dropTableIfExists('invite'))
    .then(() => knex.schema.dropSchemaIfExists('invite'));
};
