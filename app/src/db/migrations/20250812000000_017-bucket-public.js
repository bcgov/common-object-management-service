exports.up = function (knex) {
  return Promise.resolve()
    // add public column to bucket table
    .then(() => knex.schema.alterTable('bucket', table => {
      table.boolean('public').notNullable().defaultTo(false);
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // drop public column in bucket table
    .then(() => knex.schema.alterTable('bucket', table => {
      table.dropColumn('public');
    }));
};
