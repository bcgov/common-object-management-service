const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/object');
const { type } = require('../../../src/validators/common');

describe('searchMetadata', () => {
  describe('headers', () => {
    const headers = schema.fetchMetadata.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata(0).describe());
    });
  });
});
