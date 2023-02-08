const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/version');
const { scheme, type } = require('../../../src/validators/common');

describe('fetchMetadata', () => {
  describe('headers', () => {
    const headers = schema.fetchMetadata.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata().describe());
    });
  });

  describe('query', () => {
    const query = schema.fetchMetadata.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(scheme.guid.describe());
      });
    });
  });
});


describe('fetchTags', () => {

  describe('query', () => {

    const query = schema.fetchTags.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(scheme.guid.describe());
      });
    });

    const tagset = query.keys.tagset;

    it('is the expected schema', () => {
      expect(tagset).toEqual(type.tagset().describe());
    });

  });
});
