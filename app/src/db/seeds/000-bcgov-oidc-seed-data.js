const uuid = require('uuid');

const CREATED_BY = uuid.NIL;

exports.seed = function (knex) {
  return Promise.resolve()
    .then(() => {
      const items = [
        {
          createdBy: CREATED_BY,
          code: 'idir',
          display: 'IDIR',
          idpAlias: 'idir',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'bceid-basic',
          display: 'Basic BCeID',
          idpAlias: 'bceid-basic',
          active: true
        },
        {
          createdBy: CREATED_BY,
          code: 'bceid-business',
          display: 'Business BCeID',
          idpAlias: 'bceid-business',
          active: true
        },
      ];
      return knex('identity_provider').insert(items);
    });

};
