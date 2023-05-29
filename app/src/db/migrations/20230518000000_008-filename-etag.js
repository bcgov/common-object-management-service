exports.up = function (knex) {
  return Promise.resolve()
    // add name column to object table
    .then(() => knex.schema.alterTable('object', table => {
      table.string('name', 1024);
    }))
    // backfill name from path column data
    .then(() => knex('object').select(['id', 'path']))
    .then((tuples) => {
      return Promise.all(tuples.map(tuple =>
        knex('object')
          .where('id', tuple.id)
          .update({ 'name': tuple.path.match(/(?!.*\/)(.*)$/)[0] })
      ));
    })
    // add etag column to version table
    .then(() => knex.schema.alterTable('version', table => {
      table.string('etag', 65536);
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // drop etag column in version table
    .then(() => knex.schema.alterTable('version', table => {
      table.dropColumn('etag');
    }))
    // drop name column in object table
    .then(() => knex.schema.alterTable('object', table => {
      table.dropColumn('name');
    }));
};
