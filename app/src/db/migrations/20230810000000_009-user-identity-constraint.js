exports.up = function (knex) {
  return Promise.resolve()
    // remove duplicate users - deletes all but oldest of users with matching IdentityId
    // duplicates users may have existed in rare case where authentication of a new user was triggered concurrently
    .then(() => knex.raw(`DELETE FROM "public"."user" AS u
      WHERE u."userId" IN (
        SELECT DISTINCT ON ("public"."user"."identityId") "public"."user"."userId"
        FROM "public"."user"
        WHERE (
          SELECT count(*)
          FROM "public"."user" AS user2
          WHERE user2."identityId" = "public"."user"."identityId") > 1
        ORDER BY "public"."user"."identityId", "public"."user"."createdAt" DESC
      )`))

    // prevent further duplicate users - add unique index over columns identityId and idp in user table
    .then(() => knex.schema.alterTable('user', table => {
      table.unique(['identityId', 'idp']);
    }));
};

exports.down = function (knex) {
  return Promise.resolve()
    // remove unique index over columns identityId and idp in user table
    .then(() => knex.schema.alterTable('user', table => {
      table.dropUnique(['identityId', 'idp']);
    }));
};
