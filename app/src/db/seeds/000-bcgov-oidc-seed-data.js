const uuid = require('uuid');

const CREATED_BY = uuid.NIL;

exports.seed = function (knex) {
  return Promise.resolve()
    .then(() => {
      const items = [
        {
          createdBy: CREATED_BY,
          code: 'idir',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'bceid-basic',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'bceid-business',
          active: true
        },
      ];
      return knex('identity_provider').insert(items);
    });
};
