const stamps = require('../stamps');

exports.up = function (knex) {
  return Promise.resolve()

    // create metadata table
    .then(() => knex.schema.createTable('metadata', table => {
      table.specificType(
        'id',
        'integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY'
      );
      table.string('key', 255).index();
      table.string('value', 255).index();
      table.unique(['key', 'value']);
    }))

    // create version_metadata table
    .then(() => knex.schema.createTable('version_metadata', table => {
      table.primary(['versionId', 'metadataId']);
      table.uuid('versionId').notNullable().references('id').inTable('version').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('metadataId').notNullable().references('id').inTable('metadata').onDelete('CASCADE').onUpdate('CASCADE');
      stamps(knex, table);
    }))

    // create tag table
    .then(() => knex.schema.createTable('tag', table => {
      table.specificType(
        'id',
        'integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY'
      );
      table.string('key', 255).index();
      table.string('value', 255).index();
      table.unique(['key', 'value']);
    }))

    // create version_tag table
    .then(() => knex.schema.createTable('version_tag', table => {
      table.primary(['versionId', 'tagId']);
      table.uuid('versionId').notNullable().references('id').inTable('version').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('tagId').notNullable().references('id').inTable('tag').onDelete('CASCADE').onUpdate('CASCADE');
      stamps(knex, table);
    }))

    // Create metadata audit trigger
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_version_metadata_trigger
    AFTER UPDATE OR DELETE ON version_metadata
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`))
    // Create tag audit trigger
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_version_tag_trigger
    AFTER UPDATE OR DELETE ON version_tag
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`))

    /**
     * for each version, move originalName and objectId to records in metadata table
     * and create joining version_metadata records
     */
    .then(() => knex('version').where('deleteMarker', false))
    .then((rows) => {
      const versions = rows.map(v => ({
        value: v.originalName,
        versionId: v.id,
        objectId: v.objectId
      }));

      return Promise.all(versions.map((row) => {
        // insert into metadata table
        knex('metadata').insert([
          { key: 'name', value: row.value },
          { key: 'id', value: row.objectId }
        ]).onConflict(['key', 'value'])
          .merge()
          // Return just id column
          .returning('id')
          // add joining records
          .then((result) => {
            return knex('version_metadata').insert(result.map((metadata) => ({
              metadataId: metadata.id,
              versionId: row.versionId
            })));
          });
      }));
    })

    // remove column originalName from version table
    .then(() => knex.schema.alterTable('version', table => {
      table.dropColumn('originalName');
    }))

    // additional DB update: change user.identityId field to data type `string`
    .then(() => knex.schema.alterTable('user', table => {
      table.string('identityId', 255).alter();
    }));

};


exports.down = function (knex) {
  return Promise.resolve()
    // additional DB update: change user.identityId field back
    // NOTE: Destructive change - removes all data in identityId column
    .then(() => knex('user').update({ identityId: null }))
    .then(() => knex.schema.alterTable('user', table => {
      table.uuid('identityId').alter();
    }))

    // re-add columns originalName version table
    .then(() => knex.schema.alterTable('version', table => {
      table.string('originalName', 255);
    }))

    // move originalName back to version table
    .then(() => knex('version_metadata')
      .join('metadata', 'metadata.id', 'version_metadata.metadataId')
      .select('version_metadata.versionId', 'metadata.value')
      .where('metadata.key', 'name')
    )
    .then((versionMetadata) => {
      return Promise.all(versionMetadata.map((vm) => {
        return knex('version')
          .update({ originalName: vm.value })
          .where({ id: vm.versionId });
      }));
    })

    // Drop audit triggers
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_version_tag_trigger ON version_tag'))
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_version_metadata_trigger ON version_metadata'))

    // Drop tables
    .then(() => knex.schema.dropTableIfExists('version_tag'))
    .then(() => knex.schema.dropTableIfExists('tag'))
    .then(() => knex.schema.dropTableIfExists('version_metadata'))
    .then(() => knex.schema.dropTableIfExists('metadata'));
};
