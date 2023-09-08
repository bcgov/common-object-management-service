const Knex = require('knex');
const { Model } = require('objection');

const { searchPath: schemas } = require('../../knexfile');
const log = require('../components/log')(module.filename);
const models = require('./models');

class DataConnection {
  /**
   * Creates a new DataConnection with default (Postgresql) Knex configuration.
   * @class
   */
  constructor() {
    if (!DataConnection.instance) {
      const knexfile = require('../../knexfile');
      this.knex = Knex(knexfile);
      DataConnection.instance = this;
    }

    return DataConnection.instance;
  }

  /**
   * @function connected
   * True or false if connected.
   */
  get connected() {
    return this._connected;
  }

  /**
   * @function knex
   * Gets the current knex binding
   */
  get knex() {
    return this._knex;
  }

  /**
   * @function knex
   * Sets the current knex binding and forwards to Objection model
   * @param {object} v - a Knex object.
   */
  set knex(v) {
    this._knex = v;
    this._connected = false;
    Model.knex(this.knex);
  }

  /**
   * @function checkAll
   * Checks the Knex connection, the database schema, and Objection models
   * @returns {boolean} True if successful, otherwise false
   */
  async checkAll() {
    const modelsOk = !!this.knex;
    const [connectOk, schemaOk] = await Promise.all([
      this.checkConnection(),
      this.checkSchema()
    ]);
    this._connected = connectOk && schemaOk && modelsOk;
    log.verbose(`Connect OK: ${connectOk}, Schema OK: ${schemaOk}, Models OK: ${modelsOk}`, { function: 'checkAll' });

    if (!connectOk) {
      log.error('Could not connect to the database, check configuration and ensure database server is running', { function: 'checkAll' });
    }
    if (!schemaOk) {
      log.error('Connected to the database, could not verify the schema. Ensure proper migrations have been run.', { function: 'checkAll' });
    }
    if (!modelsOk) {
      log.error('Connected to the database, schema is ok, could not initialize Knex Models.', { function: 'checkAll' });
    }

    return this._connected;
  }

  /**
   * @function checkConnection
   * Checks the current knex connection to Postgres
   * If the connected DB is in read-only mode, transaction_read_only will not be off
   * @returns {boolean} True if successful, otherwise false
   */
  async checkConnection() {
    try {
      const data = await this.knex.raw('show transaction_read_only');
      const result = data?.rows[0]?.transaction_read_only === 'off';
      if (result) {
        log.debug('Database connection ok', { function: 'checkConnection' });
      } else {
        log.warn('Database connection is read-only', { function: 'checkConnection' });
      }
      this._connected = result;
      return result;
    } catch (err) {
      log.error(`Error with database connection: ${err.message}`, { function: 'checkConnection' });
      this._connected = false;
      return false;
    }
  }

  /**
   * @function checkSchema
   * Queries the knex connection to check for the existence of the expected schema tables
   * @returns {boolean} True if schema is ok, otherwise false
   */
  checkSchema() {
    try {
      const tables = Object.values(models).map(model => model.tableName);
      return Promise
        .all(tables.map(table => Promise
          .all(schemas.map(schema => this._knex.schema.withSchema(schema).hasTable(table)))))
        .then(exists => exists.every(table => table.some(exist => exist)))
        .then(result => {
          if (result) log.debug('Database schema ok', { function: 'checkSchema' });
          return result;
        });
    } catch (err) {
      log.error(`Error with database schema: ${err.message}`, { function: 'checkSchema' });
      log.error(err);
      return false;
    }
  }

  /**
   * @function checkModel
   * Attaches the Objection model to the existing knex connection
   * @returns {boolean} True if successful, otherwise false
   */
  checkModel() {
    try {
      Model.knex(this.knex);
      log.debug('Database models ok', { function: 'checkModel' });
      return true;
    } catch (err) {
      log.error(`Error attaching Model to connection: ${err.message}`, { function: 'checkModel' });
      log.error(err);
      return false;
    }
  }

  /**
   * @function close
   * Will close the DataConnection
   * @param {function} [cb] Optional callback
   */
  close(cb = undefined) {
    if (this.knex) {
      this.knex.destroy(() => {
        this.knex = undefined;
        log.info('Disconnected', { function: 'close' });
        if (cb) cb();
      });
    } else if (cb) cb();
  }

  /**
   * @function resetConnection
   * Invalidates and reconnects existing knex connection
   */
  resetConnection() {
    if (this.knex) {
      log.warn('Attempting to reset database connection pool', { function: 'resetConnection' });
      this.knex.destroy(() => {
        this.knex.initialize();
      });
    }
  }
}

module.exports = DataConnection;
