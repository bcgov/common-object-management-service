const Problem = require('api-problem');

const log = require('./log')(module.filename);

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
    return new Problem(e.response.status, { detail: e.response.data.toString() });
  } else if (e.$metadata && e.$metadata.httpStatusCode) {
    // Handle S3 promise rejections
    if (e.$response && e.$response.body) delete e.$response.body;
    return new Problem(e.$metadata.httpStatusCode, { detail: e });
  } else {
    log.error(`Unknown error calling ${service}: ${e.message}`, { function: 'errorToProblem', status: 502 });
    return new Problem(502, `Unknown ${service} Error`, { detail: e.message });
  }
}

module.exports = errorToProblem;
