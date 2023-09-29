const Problem = require('api-problem');
const contentDisposition = require('content-disposition');

/**
 * @function currentUpload
 * Injects a currentUpload object to the request based on incoming headers
 * @param {boolean} [strict=false] Short circuit returns response if misformatted
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const currentUpload = (strict = false) => {
  return (req, _res, next) => {
    // Check Content-Length Header
    const contentLength = parseInt(req.get('Content-Length'));
    // TODO: Figure out what's killing and returning a 400 in response stack
    if (!contentLength) throw new Problem(411, {
      detail: 'Content-Length must be greater than 0',
      instance: req.originalUrl
    });

    // Check Content-Disposition Header
    let filename;
    const disposition = req.get('Content-Disposition');
    if (disposition) {
      try {
        const { type, parameters } = contentDisposition.parse(disposition);
        if (strict && !type || type !== 'attachment') throw new Error('Disposition type is not \'attachment\'');
        if (strict && !parameters?.filename) throw new Error('Disposition missing \'filename\' parameter');
        filename = parameters?.filename;
      } catch (e) {
        // Ignore improperly formatted Content-Disposition when not in strict mode
        if (strict) throw new Problem(400, {
          detail: `Content-Disposition header error: ${e.message}`,
          instance: req.originalUrl
        });
      }
    } else {
      if (strict) throw new Problem(415, {
        detail: 'Content-Disposition header missing',
        instance: req.originalUrl
      });
    }

    // Check Content-Type Header
    const mimeType = req.get('Content-Type') ?? 'application/octet-stream';

    req.currentUpload = Object.freeze({
      contentLength: contentLength,
      filename: filename,
      mimeType: mimeType
    });

    /**
     * Removes the default 5 minute request timeout added in Node v18
     * This change reverts the behavior to be similar to Node v16 and earlier
     * This value should not be 0x7FFFFFFF as behavior becomes unpredictable
     * @see {@link https://nodejs.org/en/blog/release/v18.0.0#http-timeouts}
     */
    req.socket.server.requestTimeout = 0;

    next();
  };
};

module.exports = {
  currentUpload
};
