const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/sync');

describe('syncDefault', () => {

  describe('query', () => {
    const query = schema.syncDefault.query.describe();

    describe('full', () => {
      const full = query.keys.full;

      it('is a boolean', () => {
        expect(full).toBeTruthy();
        expect(full.type).toEqual('boolean');
      });

      it('contains truthy array', () => {
        expect(Array.isArray(full.truthy)).toBeTruthy();
        expect(full.truthy).toHaveLength(12);
      });

      it.each([
        true, 1, 'true', 'TRUE', 't', 'T', 'yes', 'yEs', 'y', 'Y', '1',
        false, 0, 'false', 'FALSE', 'f', 'F', 'no', 'nO', 'n', 'N', '0'
      ])('accepts the schema given %j', (value) => {
        const req = {
          query: {
            full: value
          }
        };

        expect(req).toMatchSchema(schema.syncDefault);
      });
    });
  });
});
