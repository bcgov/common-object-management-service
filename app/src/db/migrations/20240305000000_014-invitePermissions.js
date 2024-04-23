exports.up = function (knex) {
  return Promise.resolve()
    // Add permCodes to the table
    .then(() => knex.schema.alterTable('invite', table => {
      table.jsonb('permCodes');
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop permCodes column from Invite table
    .then(() => knex.schema.alterTable('invite', table => {
      table.dropColumn('permCodes');
    }));
};
