const stamps = require('../stamps');

exports.up = function (knex) {
  return Promise.resolve()

    // // create metadata table
    .then(() => knex.schema.createTable('metadata', table => {
      table.specificType(
        'id',
        'integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY'
      );
      table.string('key').index();
      table.string('value').index();
      table.unique(['key', 'value']);

    }))

    // create version_metadata table
    .then(() => knex.schema.createTable('version_metadata', table => {
      table.uuid('versionId').notNullable().references('id').inTable('version');
      table.integer('metadataId').notNullable().references('id').inTable('metadata');
      stamps(knex, table);
      table.primary(['versionId', 'metadataId']);
    }))

    // create tag table
    .then(() => knex.schema.createTable('tag', table => {
      table.specificType(
        'id',
        'integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY'
      );
      table.string('key').index();
      table.string('value').index();
      table.unique(['key', 'value']);
    }))

    // create version_tag table
    .then(() => knex.schema.createTable('version_tag', table => {
      table.uuid('versionId').notNullable().references('id').inTable('version');
      table.integer('tagId').notNullable().references('id').inTable('tag');
      stamps(knex, table);
      table.primary(['versionId', 'tagId']);
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
    .then(async (rows) => {
      const versions = rows.map(v => ({
        value: v.originalName,
        versionId: v.id,
        objectId: v.objectId
      }));
      let promises = versions.map(async (row) => {
        // insert into metadata table, returning [metadata.id]
        const insertIdArray = await knex('metadata').insert([
          { key: 'name', value: row.value },
          { key: 'id', value: row.objectId }
        ]).onConflict(['key', 'value'])
          .merge()
          .returning('id');
        // add joining records
        return knex('version_metadata').insert([
          { versionId: row.versionId, metadataId: insertIdArray[0].id },
          { versionId: row.versionId, metadataId: insertIdArray[1].id }
        ]);
      });
      await Promise.all(promises);
    })

    // remove column originalName from version table
    .then(() => knex.schema.alterTable('version', table => {
      table.dropColumn('originalName');
    }));
};


exports.down = function (knex) {
  return Promise.resolve()

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
    .then(async (versionMetadata) => {
      const promises = versionMetadata.map((vm) => {
        return knex('version')
          .update({ originalName: vm.value })
          .where({ id: vm.versionId });
      });
      await Promise.all(promises);
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
