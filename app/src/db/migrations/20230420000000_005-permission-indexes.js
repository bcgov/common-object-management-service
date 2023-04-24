exports.up = function (knex) {
  return Promise.resolve()
    // Add indexes to bucket_permission.bucketId and bucket_permission.userId
    .then(() => knex.schema.alterTable('bucket_permission', table => {
      table.uuid('bucketId').index().notNullable().alter();
      table.uuid('userId').index().notNullable().alter();
    }))
    // Add indexes to object_permission.objectId and object_permission.userId
    .then(() => knex.schema.alterTable('object_permission', table => {
      table.uuid('objectId').index().notNullable().alter();
      table.uuid('userId').index().notNullable().alter();
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Remove index on object_permission.userId and object_permission.objectId
    .then(() => knex.schema.alterTable('object_permission', table => {
      table.dropIndex('userId');
      table.dropIndex('objectId');
    }))
    // Remove index on bucket_permission.userId and bucket_permission.bucketId
    .then(() => knex.schema.alterTable('bucket_permission', table => {
      table.dropIndex('userId');
      table.dropIndex('bucketId');
    }));
};
