const baseJoi = require('joi');

const { EMAILREGEX, Permissions } = require('../components/constants');

/**
 * @constant Joi
 * Extend Base Joi with a custom 'csvArray' parser
 */
const Joi = baseJoi.extend(joi => ({
  type: 'csvArray',
  base: joi.array(),
  coerce: (value) => ({
    value: value.split ? value.split(',').map(item => item.trim()) : value,
  })
}));

/**
 * @function oneOrMany
 * Permits a single or array of comma separated models
 * @param {any|any[]} param The model to process
 * @returns {object} A Joi object
 */
function oneOrMany(param) {
  return Joi.alternatives().try(
    Joi.csvArray().items(param),
    Joi.array().items(Joi.csvArray().items(param)),
  );
}

/**
 * @constant type
 * Base Joi model definitions
 */
const type = {
  alphanum: Joi.string().alphanum().max(255),

  truthy: Joi.boolean()
    .truthy('true', 1, '1', 't', 'yes', 'y', 'false', 0, '0', 'f', 'no', 'n'),

  email: Joi.string().pattern(new RegExp(EMAILREGEX)).max(255),

  uuidv4: Joi.string().guid({
    version: 'uuidv4'
  }),

  /**
   * @function metadata
   * custom metadata (object) type schema with parameters
   * @param {number} [options.minKeyCount=0] Optional minimum number of metadata k/v pairs allowed
   * @param {number} [options.minValueStringLength=1] Optional minimum string length of metadata value allowed,
   * @returns {object} Joi object
   */
  // TODO: Simplify by changing from arrow function to property
  metadata: ({ minKeyCount = 0, minValueStringLength = 1 } = {}) => Joi.object()
    .pattern(/^x-amz-meta-\S+$/i, Joi.string().min(minValueStringLength), { matches: Joi.array().min(minKeyCount) })
    .unknown(),

  /**
   * @function tagset
   * custom tagset (object) type schema with parameters
   * @param {number} [options.maxKeyCount=9] Optional minimum number of tag k/v pairs allowed
   * @param {number} [options.minKeyCount=0] Optional minimum number of tag k/v pairs allowed
   * @param {number} [options.minValueStringLength=0] Optional minimum string length of tag value allowed,
   * (default of 9 because COMS also adds a `coms-id` tag by default)
   * @returns {object} Joi object
   */
  // TODO: Simplify by changing from arrow function to property
  tagset: ({ maxKeyCount = 9, minKeyCount = 0, minValueStringLength = 0 } = {}) => Joi.object()
    .pattern(
      /^(?!coms-id$).{1,255}$/, // don't allow key 'coms-id'
      Joi.string().min(minValueStringLength).max(255),
      { matches: Joi.array().min(minKeyCount).max(maxKeyCount) }
    )
};

/**
 * @constant scheme
 * Composite Joi model definitions
 */
const scheme = {
  guid: oneOrMany(type.uuidv4),

  string: oneOrMany(Joi.string().max(255)),

  permCode: oneOrMany(Joi.string().valid(...Object.values(Permissions)))
};

module.exports = { oneOrMany, scheme, type };
