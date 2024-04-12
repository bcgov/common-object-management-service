exports.up = function (knex) {
  return Promise.resolve()
    // Add permCodes to the table
    .then(() => knex.schema.alterTable('invite', table => {
      // Choosing jsonb instead of array as for some reasons insert does not
      // seems to be accepting data in array format, something to do with knex and postgres
      table.jsonb('permCodes');
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // permCodes column from Invite table
    .then(() => knex.schema.alterTable('invite', table => {
      table.dropColumn('permCodes');
    }));
};
