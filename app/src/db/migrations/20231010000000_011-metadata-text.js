exports.up = function (knex) {
  return Promise.resolve()
    // Change to text type
    .then(() => knex.schema.alterTable('metadata', table => {
      table.text('key').notNullable().alter();
      table.text('value').notNullable().alter();
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Revert back to varchar(255) type
    .then(() => knex.schema.alterTable('metadata', table => {
      table.string('key', 255).notNullable().alter();
      table.string('value', 255).notNullable().alter();
    }));
};
