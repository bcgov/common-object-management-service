const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/tag');
const { type } = require('../../../src/validators/common');


describe('searchTags', () => {
  describe('query', () => {
    const query = schema.searchTags.query.describe();


    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset().describe());
      });
    });
  });
});
