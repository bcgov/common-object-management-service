const stamps = require('../stamps');

exports.up = function (knex) {
  return Promise.resolve()
    // create version table
    .then(() => knex.schema.createTable('version', table => {
      // if using composite key (eg because versionId from S3 is not unique and we need to combione with objectId for a table index)
      // table.primary('id', 'objectId');
      // table.unique(['id', 'objectId']);
      table.string('id', 1024).primary();
      table.uuid('objectId').references('id').inTable('object').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      stamps(knex, table);
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop tables
    .then(() => knex.schema.dropTableIfExists('version'));
};
