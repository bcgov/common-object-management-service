const { Model } = require('objection');

const utils = {
  /**
   * @function filterILike
   * Conditionally adds a where or where in clause to the `query` if `value` is a string
   * or an array of strings respectively
   * @param {object} query The Objection Query Builder
   * @param {string|string[]} value The string or array of string values to match on
   * @param {string} column The table column to match on
   */
  filterOneOrMany(query, value, column) {
    if (value) {
      if (Array.isArray(value) && value.length) {
        query.whereIn(column, value);
      } else {
        query.where(column, value);
      }
    }
  },

  /**
   * @function filterILike
   * Conditionally adds a where ilike clause to the `query` builder if `value` is not falsy
   * ilike is a Postgres keyword for case-insensitive matching
   * @see {@link https://www.postgresql.org/docs/current/functions-matching.html}
   * @param {object} query The Objection Query Builder
   * @param {string} value The string value to match on
   * @param {string} column The table column to match on
   */
  filterILike(query, value, column) {
    if (value) query.where(column, 'ilike', `%${value}%`);
  },

  inArrayClause(column, values) {
    return values.map(p => `'${p}' = ANY("${column}")`).join(' or ');
  },

  inArrayFilter(column, values) {
    const clause = utils.inArrayClause(column, values);
    return `(array_length("${column}", 1) > 0 and (${clause}))`;
  },

  /**
   * @function redactSecrets
   * Sanitizes objects by replacing sensitive data with a REDACTED string value
   * @param {object} data An arbitrary object
   * @param {string[]} fields An array of field strings to sanitize on
   * @returns {object} An arbitrary object with specified secret fields marked as redacted
   */
  redactSecrets(data, fields) {
    if (fields && Array.isArray(fields) && fields.length) {
      fields.forEach(field => {
        if (data[field]) data[field] = 'REDACTED';
      });
    }
    return data;
  },

  toArray(values) {
    if (values) {
      return Array.isArray(values) ? values.filter(p => p && p.trim().length > 0) : [values].filter(p => p && p.trim().length > 0);
    }
    return [];
  },

  /**
   * @function trx
   * Wraps Objection/Knex queries in an Objection Transaction object
   * @param {*} callback The objection queries that we want to enclose in a transaction
   * @returns {Promise<object} The transaction object
   * @throws The error encountered upon db transaction failure
   */
  async trxWrapper(callback) {
    const trx = await Model.startTransaction();
    try {
      const result = await callback(trx);
      await trx.commit();
      return Promise.resolve(result);
    } catch (err) {
      if (trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = utils;
