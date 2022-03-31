/**
 * @function filterILike
 * Conditionally adds a where or where in clause to the `query` if `value` is a string
 * or an array of strings respectively
 * @param {object} query The Objection Query Builder
 * @param {string|string[]} value The string or array of string values to match on
 * @param {string} column The table column to match on
 */
const filterOneOrMany = (query, value, column) => {
  if (value) {
    if (Array.isArray(value) && value.length) {
      query.whereIn(column, value);
    } else {
      query.where(column, value);
    }
  }
};

/**
 * @function filterILike
 * Conditionally adds a where ilike clause to the `query` builder if `value` is not falsy
 * ilike is a Postgres keyword for case-insensitive matching
 * @see https://www.postgresql.org/docs/current/functions-matching.html
 * @param {object} query The Objection Query Builder
 * @param {string} value The string value to match on
 * @param {string} column The table column to match on
 */
const filterILike = (query, value, column) => {
  if (value) query.where(column, 'ilike', `%${value}%`);
};

const inArrayClause = (column, values) => {
  return values.map(p => `'${p}' = ANY("${column}")`).join(' or ');
};

const inArrayFilter = (column, values) => {
  const clause = inArrayClause(column, values);
  return `(array_length("${column}", 1) > 0 and (${clause}))`;
};

const tableNames = (models) => {
  return Object.values(models).map(model => model.tableName);
};

const toArray = (values) => {
  if (values) {
    return Array.isArray(values) ? values.filter(p => p && p.trim().length > 0) : [values].filter(p => p && p.trim().length > 0);
  }
  return [];
};

module.exports = {
  filterOneOrMany,
  filterILike,
  inArrayClause,
  inArrayFilter,
  tableNames,
  toArray
};
