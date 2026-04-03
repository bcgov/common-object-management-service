const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/version');
const { scheme, type } = require('../../../src/validators/common');

jest.mock('config');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('fetchMetadata', () => {
  describe('headers', () => {
    const headers = schema.fetchMetadata.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata().describe());
    });
  });

  describe('query', () => {
    const query = schema.fetchMetadata.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(scheme.string.describe());
      });
    });
  });
});


describe('fetchTags', () => {

  describe('query', () => {

    const query = schema.fetchTags.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(scheme.string.describe());
      });
    });

    const tagset = query.keys.tagset;

    it('is the expected schema', () => {
      expect(tagset).toEqual(type.tagset().describe());
    });

  });
});
