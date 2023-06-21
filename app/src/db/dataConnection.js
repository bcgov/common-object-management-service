const config = require('config');
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
      if (config.has('db.enabled')) {
        const knexfile = require('../../knexfile');
        this.knex = Knex(knexfile);
      }
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
   * Sets the current knex binding
   * @param {object} v - a Knex object.
   */
  set knex(v) {
    this._knex = v;
    this._connected = false;
  }

  /**
   * @function checkAll
   * Checks the Knex connection, the database schema, and Objection models
   * @returns {boolean} True if successful, otherwise false
   */
  async checkAll() {
    if (config.has('db.enabled')) {
      const connectOk = await this.checkConnection();
      const schemaOk = await this.checkSchema();
      const modelsOk = this.checkModel();

      log.debug(`Connect OK: ${connectOk}, Schema OK: ${schemaOk}, Models OK: ${modelsOk}`, { function: 'checkAll' });
      this._connected = connectOk && schemaOk && modelsOk;
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
    } else {
      return true;
    }
  }

  /**
   * @function checkConnection
   * Checks the current knex connection to Postgres
   * If the connected DB is in read-only mode, transaction_read_only will not be off
   * @returns {boolean} True if successful, otherwise false
   */
  async checkConnection() {
    if (config.has('db.enabled')) {
      try {
        const data = await this.knex.raw('show transaction_read_only');
        const result = data && data.rows && data.rows[0].transaction_read_only === 'off';
        if (result) {
          log.debug('Database connection ok', { function: 'checkConnection' });
        }
        else {
          log.warn('Database connection is read-only', { function: 'checkConnection' });
        }
        return result;
      } catch (err) {
        log.error(`Error with database connection: ${err.message}`, { function: 'checkConnection' });
        return false;
      }
    } else {
      return true;
    }
  }

  /**
   * @function checkSchema
   * Queries the knex connection to check for the existence of the expected schema tables
   * @returns {boolean} True if schema is ok, otherwise false
   */
  checkSchema() {
    if (config.has('db.enabled')) {
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
    } else {
      return true;
    }
  }

  /**
   * @function checkModel
   * Attaches the Objection model to the existing knex connection
   * @returns {boolean} True if successful, otherwise false
   */
  checkModel() {
    if (config.has('db.enabled')) {
      try {
        Model.knex(this.knex);
        log.debug('Database models ok', { function: 'checkModel' });
        return true;
      } catch (err) {
        log.error(`Error attaching Model to connection: ${err.message}`, { function: 'checkModel' });
        log.error(err);
        return false;
      }
    } else {
      return true;
    }
  }

  /**
   * @function close
   * Will close the DataConnection
   * @param {function} [cb] Optional callback
   */
  close(cb = undefined) {
    if (config.has('db.enabled') && this.knex) {
      try {
        this.knex.destroy(() => {
          this._connected = false;
          log.info('Disconnected', { function: 'close' });
          if (cb) cb();
        });
      } catch (e) {
        log.error(e);
      }
    } else {
      if (cb) cb();
    }
  }

  /**
   * @function resetConnection
   * Invalidates and reconnects existing knex connection
   */
  resetConnection() {
    if (config.has('db.enabled')) {
      log.warn('Attempting to reset database connection pool...', { function: 'resetConnection' });
      this.knex.destroy(() => {
        this.knex.initialize();
      });
    }
  }
}

module.exports = DataConnection;
