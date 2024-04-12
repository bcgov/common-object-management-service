exports.up = function (knex) {
  return Promise.resolve()
    // Add permissionsCode to the table
    .then(() => knex.schema.alterTable('invite', table => {
      // Choosing jsonb instead of array as for some reasons insert does not
      // seems to be accepting data in array format, something to do with knex and postgres
      table.jsonb('permissionsCode');
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // permissionsCode column from Invite table
    .then(() => knex.schema.alterTable('invite', table => {
      table.dropColumn('permissionsCode');
    }));
};
