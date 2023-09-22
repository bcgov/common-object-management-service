const Problem = require('api-problem');

const log = require('./log')(module.filename);

/**
 * @function errorToProblem
 * Attempts to interpret and infer the type of Problem to respond with
 * @param {string} service A string representing which service the error occured at
 * @param {Error} e The raw error exception object
 * @returns {Problem} A problem error type
 */
function errorToProblem(service, e) {
  // If already problem type, just return as is
  if (e instanceof Problem) {
    return e;
  } else if (e.response) {
    // Handle raw data
    let data;
    if (typeof e.response.data === 'string' || e.response.data instanceof String) {
      data = JSON.parse(e.response.data);
    } else {
      data = e.response.data;
    }

    log.error(`Error from ${service}`, { function: 'errorToProblem', status: e.response.status, data: data });
    // Validation Error
    if (e.response.status === 422) {
      return new Problem(e.response.status, {
        detail: data.detail,
        errors: data.errors
      });
    }
    // Something else happened but there's a response
    return new Problem(e.response.status, { detail: e.response.data });
  } else if (e.statusCode) {
    // Handle errors with Status Codes
    return new Problem(e.statusCode, { detail: e.message });
  } else if (e.$metadata && e.$metadata.httpStatusCode) {
    // Handle S3 promise rejections
    if (e.$response && e.$response.body) delete e.$response.body;
    return new Problem(e.$metadata.httpStatusCode, { detail: e });
  } else {
    // Handle all other errors
    const message = `${service} Error: ${e.message}`;
    log.error(message, { error: e, function: 'errorToProblem', status: 500 });
    return new Problem(500, { detail: message });
  }
}

module.exports = errorToProblem;
