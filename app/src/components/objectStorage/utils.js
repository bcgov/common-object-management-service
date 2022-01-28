const DELIMITER = '/';

const utils = {
  delimit(s) {
    if (s) {
      return s.endsWith(DELIMITER) ? s : `${s}${DELIMITER}`;
    }
    return '';
  },

  join(...items) {
    if (items && items.length) {
      const parts = [];
      items.map(p => {
        if (p) {
          p.split('/').map(x => {
            if (x && x.trim().length) parts.push(x);
          });
        }
      });
      return parts.join(DELIMITER);
    }
    return '';
  },

  // https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755446927
  streamToBuffer(stream) { // Readable
    return new Promise((resolve, reject) => {
      const chunks = []; // Uint8Array[]
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
};

module.exports = utils;
