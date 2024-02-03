exports.up = function (knex) {
  return Promise.resolve()
    // Add lastModifiedDate column to version table
    .then(() => knex.schema.alterTable('version', table => {
      table.timestamp('lastModifiedDate', { useTz: true });
    }))
    // Add lastSyncedDate column to object table
    .then(() => knex.schema.alterTable('object', table => {
      table.timestamp('lastSyncedDate', { useTz: true });
    }))
    // Add lastSyncRequestedDate to bucket table
    .then(() => knex.schema.alterTable('bucket', table => {
      table.timestamp('lastSyncRequestedDate', { useTz: true });
    }));

};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop lastSyncRequestedDate from bucket table
    .then(() => knex.schema.alterTable('bucket', table => {
      table.dropColumn('lastSyncRequestedDate');
    }))
    // DroplastSyncedDate column from object table
    .then(() => knex.schema.alterTable('object', table => {
      table.dropColumn('lastSyncedDate');
    }))
    // Drop lastModifiedDate column from version table
    .then(() => knex.schema.alterTable('version', table => {
      table.dropColumn('lastModifiedDate');
    }));
};
