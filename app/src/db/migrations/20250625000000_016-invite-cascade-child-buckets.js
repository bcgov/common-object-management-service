/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return Promise.resolve()
    // add recursive column to invite table
    .then(() => knex.schema.alterTable('invite', table => {
      table.boolean('recursive').notNullable().defaultTo(false);
    }));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.resolve()
    // drop recursive column from invite table
    .then(() => knex.schema.alterTable('invite', table => {
      table.dropColumn('recursive');
    }));
};
