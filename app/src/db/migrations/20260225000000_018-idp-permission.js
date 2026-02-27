const stamps = require('../stamps');

exports.up = function (knex) {
  return Promise.resolve()

    // create tables
    .then(() => knex.schema.createTable('object_idp_permission', table => {
      table.uuid('id').primary();
      table.uuid('objectId').references('id').inTable('object').notNullable().onUpdate('CASCADE')
        .onDelete('CASCADE');
      table.string('idp').references('idp').inTable('identity_provider').notNullable().onUpdate('CASCADE')
        .onDelete('CASCADE');
      table.string('permCode').references('permCode').inTable('permission').notNullable().onUpdate('CASCADE')
        .onDelete('CASCADE');
      stamps(knex, table);
    }))
    .then(() => knex.schema.createTable('bucket_idp_permission', table => {
      table.uuid('id').primary();
      table.uuid('bucketId').references('bucketId').inTable('bucket').notNullable().onUpdate('CASCADE')
        .onDelete('CASCADE');
      table.string('idp').references('idp').inTable('identity_provider').notNullable().onUpdate('CASCADE')
        .onDelete('CASCADE');
      table.string('permCode').references('permCode').inTable('permission').notNullable().onUpdate('CASCADE')
        .onDelete('CASCADE');
      stamps(knex, table);
    }))

    // Create audit triggers
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_object_idp_permission_trigger
    AFTER UPDATE OR DELETE ON object_idp_permission
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`))

    .then(() => knex.schema.raw(`CREATE TRIGGER audit_bucket_idp_permission_trigger
    AFTER UPDATE OR DELETE ON bucket_idp_permission
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`));
};

exports.down = function (knex) {
  return Promise.resolve()

    // Drop audit triggers
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_bucket_idp_permission_trigger ON bucket_idp_permission'))
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_object_idp_permission_trigger ON object_idp_permission'))

    // Drop table
    .then(() => knex.schema.dropTableIfExists('bucket_idp_permission'))
    .then(() => knex.schema.dropTableIfExists('object_idp_permission'));
};
