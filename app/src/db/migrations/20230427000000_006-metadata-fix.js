exports.up = function (knex) {
  return Promise.resolve()
    .then(() => knex('metadata')
      .where({ key: 'id' })
      .update({ key: 'coms-id' })
    )
    .then(() => knex('metadata')
      .where({ key: 'name' })
      .update({ key: 'coms-name' })
    );
};

exports.down = function (knex) {
  return Promise.resolve()
    .then(() => knex('metadata')
      .where({ key: 'coms-id' })
      .update({ key: 'id' })
    )
    .then(() => knex('metadata')
      .where({ key: 'coms-name' })
      .update({ key: 'name' })
    );
};
