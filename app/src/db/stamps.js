const { NIL: SYSTEM_USER } = require('uuid');

module.exports = (knex, table) => {
  table.string('createdBy').defaultTo(SYSTEM_USER);
  table.timestamp('createdAt', { useTz: true }).defaultTo(knex.fn.now());
  table.string('updatedBy');
  table.timestamp('updatedAt', { useTz: true });
};
