const stamps = require('../stamps');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

exports.up = function (knex) {
  return Promise.resolve()
    // create version table
    .then(() => knex.schema.createTable('version', table => {
      table.uuid('id').primary();
      table.string('versionId', 1024);
      table.uuid('objectId').references('id').inTable('object').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.string('originalName', 255);
      table.string('mimeType', 255);
      table.boolean('deleteMarker').notNullable().defaultTo(false);
      stamps(knex, table);
    }))

    // Create audit trigger
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_version_trigger
    AFTER UPDATE OR DELETE ON version
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`))

    // create a 'default' version for each object and move mimeType and originalName values
    .then(() => knex('object'))
    .then((rows) => {
      const versions = rows.map(o => ({
        id: uuidv4(),
        objectId: o.id,
        originalName: o.originalName,
        mimeType: o.mimeType,
        createdBy: SYSTEM_USER,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      }));

      return versions.length ? knex('version').insert(versions) : Promise.resolve();
    })

    // remove columns originalName and mimeType from object table
    .then(() => knex.schema.alterTable('object', table => {
      table.dropColumn('originalName');
      table.dropColumn('mimeType');
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // re-add columns originalName and mimeType to object table
    .then(() => knex.schema.alterTable('object', table => {
      table.string('originalName', 255);
      table.string('mimeType', 255);
    }))

    // move originalName and mimeType values back to object table
    .then(() => knex.select('*')
      .distinctOn('objectId')
      .from('version')
      .orderBy([
        { column: 'objectId' },
        { column: 'createdAt', order: 'desc' }
      ])
    )
    .then((rows) => {
      const data = rows.map(row => ({
        id: row.objectId,
        originalName: row.originalName,
        mimeType: row.mimeType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));

      if (data && data.length) {
        return Promise.all(data.map((row) => {
          return knex('object')
            .where({ 'id': row.id })
            .update({
              'originalName': row.originalName,
              'mimeType': row.mimeType,
              'createdAt': row.createdAt,
              'updatedAt': row.updatedAt
            });
        }));
      }
    })

    // Drop audit trigger
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_version_trigger ON version'))

    // Drop tables
    .then(() => knex.schema.dropTableIfExists('version'));
};
