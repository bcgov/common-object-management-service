// change updatedAt column to have no default value
// timestamps.js mixin will add CURRENT_TIMESTAMP on update
exports.up = function (knex) {
  return Promise.resolve()
    .then(() => knex.schema.alterTable('bucket', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('bucket_permission', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('identity_provider', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('object', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('object_permission', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('permission', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('user', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('version', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('version_metadata', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }))
    .then(() => knex.schema.alterTable('version_tag', table => {
      table.timestamp('updatedAt', { useTz: true }).alter();
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    .then(() => knex.schema.alterTable('version_tag', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('version_metadata', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('version', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('user', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('permission', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('object_permission', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('object', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('identity_provider', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('bucket_permission', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }))
    .then(() => knex.schema.alterTable('bucket', table => {
      table.timestamp('updatedAt', { useTz: true }).defaultTo(knex.fn.now()).alter();
    }));
};
