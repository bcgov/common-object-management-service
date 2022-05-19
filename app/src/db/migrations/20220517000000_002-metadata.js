const stamps = require('../stamps');
// const { NIL: SYSTEM_USER } = require('uuid');

exports.up = function (knex) {
  return Promise.resolve()
    // create metadata table
    .then(() => knex.schema.createTable('metadata', table => {
      table.increments();
      table.string('key', 2048);
      table.string('value', 2048);
      stamps(knex, table);
    }))
    // create version_metadata table
    .then(() => knex.schema.createTable('version_metadata', table => {
      // if using composite key on version table
      // table.string('versionId').notNullable();
      // table.uuid('objectId').notNullable();
      // table.primary(['versionId', 'objectId']);
      // table.foreign(['versionId', 'objectId']).references(['id', 'objectId']).inTable('version').onUpdate('CASCADE').onDelete('CASCADE');
      table.integer('metadataId').notNullable().references('id').inTable('metadata').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.string('versionId', 1024).notNullable().references('version.id').onUpdate('CASCADE').onDelete('CASCADE');
      // composite key to make selects faster
      table.primary(['versionId', 'metadataId']);
      stamps(knex, table);
    }));

  // insert some default metadata records:
  //
  // .then(() => {
  //   const metaData = [
  //     { key: 'Title', value: null },
  //     { key: 'Creator ', value: 'Common Object Management Service' },
  //     { key: 'Description', value: null },
  //     { key: 'Format', value: null },
  //     { key: 'ID', value: null },
  //     { key: 'Information Schedule', value: null },
  //     { key: 'Security Classification', value: null }
  //   ];
  //   const items = metaData.map((el) => ({
  //     key: el.key,
  //     value: el.value,
  //     createdBy: SYSTEM_USER,
  //   }));
  //   return knex('metadata').insert(items);
  // });
};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop tables
    .then(() => knex.schema.dropTableIfExists('version_metadata'))
    .then(() => knex.schema.dropTableIfExists('metadata'));
};
