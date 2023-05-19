const { Joi: baseJoi } = require('express-validation');

const { EMAILREGEX, Permissions } = require('../components/constants');

/**
 * @constant Joi
 * Extend Base Joi with a custom 'csvArray' parser
 */
const Joi = baseJoi.extend((joi) => {
  return {
    type: 'csvArray',
    base: joi.array(),
    coerce: (value) => ({
      value: value.split ? value.split(',').map(item => item.trim()) : value,
    })
  };
});

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

  metadata: (minKeyCount = 0, minValueStringLength = 0) => Joi.object()
    .pattern(/^x-amz-meta-.{1,255}$/i, Joi.string().min(minValueStringLength).max(255), { matches: Joi.array().min(minKeyCount) })
    .unknown(),

  tagset: (minKeyCount = 1, minValueStringLength = 0) => Joi.object()
    .pattern(
      /^((?!coms-id).){1,255}$/, // don't allow key 'coms-id'
      Joi.string().min(minValueStringLength).max(255),
      { matches: Joi.array().min(minKeyCount) },

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
