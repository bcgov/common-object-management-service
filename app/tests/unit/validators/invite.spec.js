const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { type } = require('../../../src/validators/common');
const { schema } = require('../../../src/validators/invite');

describe('createInvite', () => {
  describe('body', () => {
    const body = schema.createInvite.body.describe();

    it('enforces bucketId/objectId mutual exclusion', () => {
      expect(body.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({
          rel: 'xor',
          peers: expect.arrayContaining(['bucketId', 'objectId'])
        })
      ]));
    });

    describe('bucketId', () => {
      const bucketId = body.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(type.uuidv4.describe());
      });
    });

    describe('email', () => {
      const email = body.keys.email;

      it('is the expected schema', () => {
        expect(email).toEqual(type.email.describe());
      });
    });

    // TODO: Investigate if rule arguments can support dynamic date offset calculations
    describe('expiresAt', () => {
      const expiresAt = body.keys.expiresAt;

      it('is the expected schema', () => {
        expect(expiresAt).toEqual(expect.objectContaining({
          type: 'date',
          flags: expect.objectContaining({ format: 'unix' }),
          rules: expect.arrayContaining([expect.objectContaining({
            name: 'greater',
            args: expect.objectContaining({ date: 'now' })
          })])
        }));
      });
    });

    describe('objectId', () => {
      const objectId = body.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.describe());
      });
    });
  });
});

describe('useInvite', () => {
  describe('params', () => {
    const params = schema.useInvite.params.describe();

    describe('token', () => {
      const token = params.keys.token;

      it('is the expected schema', () => {
        expect(token).toEqual(type.uuidv4.describe());
      });
    });
  });
});
