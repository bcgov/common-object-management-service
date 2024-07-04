exports.up = function (knex) {
  return Promise.resolve()
    // Create invite audit trigger
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_invite_trigger
    AFTER UPDATE OR DELETE ON invite
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`));
};

exports.down = function (knex) {
  return Promise.resolve()
    // Drop invite audit trigger
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_invite_trigger ON invite'));
};
