const Problem = require('api-problem');
const contentDisposition = require('content-disposition');

/**
 * @function currentUpload
 * Injects a currentUpload object to the request based on incoming headers
 * @param {boolean} [strict=false] Short circuit returns response if misformatted
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const currentUpload = (strict = false) => {
  return (req, res, next) => {
    req.setTimeout(0);
    // Check Content-Length Header
    const contentLength = parseInt(req.get('Content-Length'));
    // TODO: Figure out what's killing and returning a 400 in response stack
    if (!contentLength) return new Problem(411, { detail: 'Content-Length must be greater than 0' }).send(res);

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
        if (strict) return new Problem(400, { detail: `Content-Disposition header error: ${e.message}` }).send(res);
      }
    } else {
      if (strict) return new Problem(415, { detail: 'Content-Disposition header missing' }).send(res);
    }

    // Check Content-Type Header
    const mimeType = req.get('Content-Type') ?? 'application/octet-stream';

    req.currentUpload = Object.freeze({
      contentLength: contentLength,
      filename: filename,
      mimeType: mimeType
    });

    next();
  };
};

module.exports = {
  currentUpload
};
