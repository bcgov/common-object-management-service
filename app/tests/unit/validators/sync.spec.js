const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/sync');
const { scheme } = require('../../../src/validators/common');


describe('syncStatus', () => {
  describe('query', () => {
    const query = schema.syncStatus.query.describe();

    describe('bucketId', () => {
      const bucketId = query.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(scheme.guid.describe());
      });
    });
  });
});
