exports.up = function (knex) {
  return Promise.resolve()
    // allow null for object.public
    .then(() => knex.schema.alterTable('object', table => {
      table.boolean('public').nullable().alter();
    }))
    // where object.public is false, set to null
    .then(() => knex('object')
      .where({ 'public': false })
      .update({ 'public': null }))
    .then(() => knex.schema.alterTable('object', table => {
      table.boolean('public').nullable().alter();
    }))
    // add public column to bucket table
    .then(() => knex.schema.alterTable('bucket', table => {
      table.boolean('public');
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // drop public column in bucket table
    .then(() => knex.schema.alterTable('bucket', table => {
      table.dropColumn('public');
    }))
    // where object.public is null, set to false
    .then(() => knex('object')
      .where({ 'public': null })
      .update({ 'public': false }))

    // disallow null for object.public
    .then(() => knex.schema.alterTable('object', table => {
      table.boolean('public').notNullable().alter();
    }));
};
