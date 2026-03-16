const Problem = require('api-problem');

/**
 * @function validator
 * Performs express request validation against a specified `schema`
 * @param {object} schema An object containing Joi validation schema definitions
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const validate = (schema) => {
  return (req, _res, next) => {

    /**
     * Our implementation of Joi is unable to handle arrays with over 20 items passed in query parameters 
     * Ensure the object is converted to an array
     */
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        req.query[key] = Object.values(value);
      }
    });

    const validationErrors = Object.entries(schema)
      .map(([prop, def]) => {
        const result = def.validate(req[prop], { abortEarly: false })?.error;
        return result ? [prop, result?.details] : undefined;
      })
      .filter(error => !!error);

    if (Object.keys(validationErrors).length) {
      throw new Problem(422, {
        detail: validationErrors
          .flatMap(groups => groups[1]?.map(error => error?.message))
          .join('; '),
        instance: req.originalUrl,
        errors: Object.fromEntries(validationErrors)
      });
    }
    else next();
  };
};

module.exports = {
  validate
};
