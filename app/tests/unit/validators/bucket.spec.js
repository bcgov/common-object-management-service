const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/bucket');
const { scheme, type } = require('../../../src/validators/common');

describe('createBucket', () => {

  describe('body', () => {
    const body = schema.createBucket.body.describe();

    it('should match the schema', () => {
      const value = {
        body: {
          secretAccessKey: 'xyz',
          key: 'coms/dev',
          accessKeyId: 'bbb',
          bucket: 'ccc',
          endpoint: 'https://s3.ca',
          bucketName: 'My Bucket',
          active : true
        }
      };
      expect(value).toMatchSchema(schema.createBucket);
    });


    it('is required', () => {
      expect(body.flags).toBeTruthy();
      expect(body.flags).toEqual(expect.objectContaining({ presence: 'required' }));
    });
  });
});

describe('deleteBucket', () => {

  describe('params', () => {
    const params = schema.deleteBucket.params.describe();

    describe('bucketId', () => {
      const bucketId = params.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(type.uuidv4.describe());
      });
    });
  });
});

describe('headBucket', () => {

  describe('params', () => {
    const params = schema.headBucket.params.describe();

    describe('bucketId', () => {
      const bucketId = params.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual({
          flags: { presence: 'required' },
          rules: [{ args: { options: { version: 'uuidv4' } }, name: 'guid' }],
          type: 'string'
        });
      });
    });
  });

});

describe('readBucket', () => {

  describe('params', () => {
    const params = schema.readBucket.params.describe();

    describe('bucketId', () => {
      const bucketId = params.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(type.uuidv4.describe());
      });
    });
  });

});

describe('searchBuckets', () => {

  describe('query', () => {
    const query = schema.searchBuckets.query.describe();

    describe('bucketId', () => {
      const bucketId = query.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(scheme.guid.describe());
      });
    });

    describe('bucketName', () => {
      const bucketName = query.keys.bucketName;

      it('is the expected schema', () => {
        expect(bucketName.type).toEqual('string');
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(bucketName.rules)).toBeTruthy();
        expect(bucketName.rules).toHaveLength(1);
        expect(bucketName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({ 'args': { 'limit': 255 }, 'name': 'max' }),
        ]));
      });
    });

    describe('key', () => {
      const key = query.keys.key;

      it('is the expected schema', () => {
        expect(key.type).toEqual('string');
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(key.rules)).toBeTruthy();
        expect(key.rules).toHaveLength(1);
        expect(key.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({ 'args': { 'limit': 255 }, 'name': 'max' }),
        ]));
      });
    });

    describe('active', () => {
      const active = query.keys.active;

      it('is the expected schema', () => {
        expect(active).toEqual(type.truthy.describe());
      });
    });
  });
});

describe('updateBucket', () => {

  describe('body', () => {
    const body = schema.updateBucket.body.describe();

    it('to be an object ', () => {
      expect(body).toBeTruthy();
      expect(body.type).toEqual('object');
    });

    it('value to match schema', () => {
      const value = {
        body: {
          bucketName: 'My Re-named Bucket',
        }
      };
      expect(value).toMatchSchema(schema.updateBucket);
    });
  });

  describe('params', () => {
    const params = schema.updateBucket.params.describe();

    describe('bucketId', () => {
      const bucketId = params.keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(type.uuidv4.describe());
      });
    });
  });

});
