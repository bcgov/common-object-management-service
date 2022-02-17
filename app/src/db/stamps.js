const uuid = require('uuid');

const CREATED_BY = uuid.NIL;

module.exports = (knex, table) => {
  table.string('createdBy').defaultTo(CREATED_BY);
  table.timestamp('createdAt', {useTz: true}).defaultTo(knex.fn.now());
  table.string('updatedBy');
  table.timestamp('updatedAt', {useTz: true}).defaultTo(knex.fn.now());
};
