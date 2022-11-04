const stamps = require('../stamps');

exports.up = function (knex) {
  return Promise.resolve()
    // Create bucket tables
    .then(() => knex.schema.createTable('bucket', table => {
      table.uuid('bucketId').primary();
      table.string('bucketName', 255).notNullable().index();
      table.string('accessKeyId', 255).notNullable();
      table.string('bucket', 255).notNullable();
      table.string('endpoint', 255).notNullable();
      table.string('key', 255).notNullable();
      table.string('secretAccessKey', 255).notNullable();
      table.string('region', 255);
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
      table.unique(['bucket', 'endpoint', 'key']);
    }))
    .then(() => knex.schema.createTable('bucket_permission', table => {
      table.uuid('id').primary();
      table.uuid('bucketId').references('bucketId').inTable('bucket').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.uuid('userId').references('userId').inTable('user').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.string('permCode').references('permCode').inTable('permission').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      stamps(knex, table);
    }))

    // Add object-bucket relation
    .then(() => knex.schema.alterTable('object', table => {
      table.uuid('bucketId').references('bucketId').inTable('bucket').onUpdate('CASCADE').onDelete('CASCADE');
    }))

    // Ensure appropriate columns are not nullable
    .then(() => knex.schema.alterTable('metadata', table => {
      table.string('key').notNullable().alter();
      table.string('value').notNullable().alter();
    }))
    .then(() => knex.schema.alterTable('tag', table => {
      table.string('key').notNullable().alter();
      table.string('value').notNullable().alter();
    }))
    .then(() => knex.schema.alterTable('version', table => {
      table.string('mimeType').notNullable().defaultTo('application/octet-stream').alter();
    }))

    // Create audit triggers
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_bucket_trigger
    AFTER UPDATE OR DELETE ON bucket
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`))
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_bucket_permission_trigger
    AFTER UPDATE OR DELETE ON bucket_permission
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop audit triggers
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_bucket_permission_trigger ON object_permission'))
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_bucket_trigger ON object'))

    // Revert not nullable column updates
    .then(() => knex.schema.alterTable('version', table => {
      table.string('mimeType').alter();
    }))
    .then(() => knex.schema.alterTable('tag', table => {
      table.string('key').alter();
      table.string('value').alter();
    }))
    .then(() => knex.schema.alterTable('metadata', table => {
      table.string('key').alter();
      table.string('value').alter();
    }))

    // Remove object-bucket relation
    .then(() => knex.schema.alterTable('object', table => {
      table.dropColumn('bucketId');
    }))

    // Drop bucket tables
    .then(() => knex.schema.dropTableIfExists('bucket_permission'))
    .then(() => knex.schema.dropTableIfExists('bucket'));
};
