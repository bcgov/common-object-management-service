const crypto = require('crypto');
const Joi = require('joi');
const jestJoi = require('jest-joi');
const { DownloadMode, SortOrder } = require('../../../src/components/constants');
expect.extend(jestJoi.matchers);

const { schema } = require('../../../src/validators/object');
const { scheme, type } = require('../../../src/validators/common');

jest.mock('config');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('addMetadata', () => {

  describe('headers', () => {
    const headers = schema.addMetadata.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata(1, 1).describe());
    });
  });

  describe('params', () => {
    const params = schema.addMetadata.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.addMetadata.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });
  });
});

describe('addTags', () => {

  describe('params', () => {
    const params = schema.addTags.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.addTags.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset(1, 1).describe());
      });
    });
  });
});

describe('createObject', () => {

  describe('headers', () => {
    const headers = schema.createObject.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata().describe());
    });
  });

  describe('query', () => {
    describe('bucketId', () => {
      const bucketId = schema.createObject.query.describe().keys.bucketId;

      it('is the expected schema', () => {
        expect(bucketId).toEqual(type.uuidv4.required().describe());
      });
    });

    describe('tagset', () => {
      const tagset = schema.createObject.query.describe().keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset().describe());
      });
    });
  });
});

describe('deleteMetadata', () => {

  describe('headers', () => {
    const headers = schema.deleteMetadata.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata().describe());
    });
  });

  describe('params', () => {
    const params = schema.deleteMetadata.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.deleteMetadata.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });
  });
});

describe('deleteObject', () => {

  describe('params', () => {
    const params = schema.deleteObject.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.deleteObject.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });
  });
});

describe('deleteTags', () => {

  describe('params', () => {
    const params = schema.deleteTags.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.deleteTags.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset().describe());
      });
    });
  });
});

describe('headObject', () => {

  describe('params', () => {
    const params = schema.headObject.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual({
          flags: { presence: 'required' },
          ...type.uuidv4.describe()
        });
      });
    });
  });

  describe('query', () => {
    const query = schema.headObject.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });
  });
});

describe('listObjectVersion', () => {

  describe('params', () => {
    const params = schema.listObjectVersion.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });
});

describe('readObject', () => {

  describe('params', () => {
    const params = schema.readObject.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.readObject.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });

    describe('expiresIn', () => {
      const expiresIn = query.keys.expiresIn;

      it('is the expected schema', () => {
        expect(expiresIn).toEqual(Joi.number().describe());
      });
    });

    describe('download', () => {
      const download = query.keys.download;

      it('is the expected schema', () => {
        expect(download).toEqual(expect.objectContaining({
          type: 'string',
          allow: expect.arrayContaining(Object.values(DownloadMode))
        }));
      });
    });
  });
});

describe('replaceMetadata', () => {

  describe('headers', () => {
    const headers = schema.replaceMetadata.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata().describe());
    });
  });

  describe('params', () => {
    const params = schema.replaceMetadata.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.replaceMetadata.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });
  });
});


describe('replaceTags', () => {

  describe('params', () => {
    const params = schema.replaceTags.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.replaceTags.query.describe();

    describe('s3VersionId', () => {
      const s3VersionId = query.keys.s3VersionId;

      it('is the expected schema', () => {
        expect(s3VersionId).toEqual(Joi.string().describe());
      });
    });

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset().describe());
      });
    });
  });
});

describe('searchObjects', () => {

  describe('headers', () => {
    const headers = schema.searchObjects.headers.describe();

    it('is an object', () => {
      expect(headers).toBeTruthy();
      expect(headers.type).toEqual('object');
    });

    it('permits other attributes', () => {
      expect(headers.flags).toBeTruthy();
      expect(headers.flags).toEqual(expect.objectContaining({
        unknown: true
      }));
    });

    it('enforces general metadata pattern', () => {
      expect(headers.patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          regex: '/^x-amz-meta-\\S+$/i',
          rule: expect.objectContaining({
            type: 'string',
            rules: expect.arrayContaining([
              expect.objectContaining({
                name: 'min',
                args: expect.objectContaining({
                  limit: 1
                })
              })
            ])
          })
        })
      ]));
    });
  });

  describe('query', () => {
    const query = schema.searchObjects.query.describe();

    describe('objectId', () => {
      const objectId = query.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(scheme.guid.describe());
      });
    });

    describe('name', () => {
      const name = query.keys.name;

      it('is the expected schema', () => {
        expect(name.type).toEqual('string');
      });
    });

    describe('path', () => {
      const path = query.keys.path;

      it('is a string', () => {
        expect(path).toBeTruthy();
        expect(path.type).toEqual('string');
      });

      it('has a max length of 1024', () => {
        expect(Array.isArray(path.rules)).toBeTruthy();
        expect(path.rules).toHaveLength(1);
        expect(path.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'limit': 1024
            },
            'name': 'max'
          }),
        ]));
      });

      it('matches the schema', () => {
        expect('some/path/to/object').toMatchSchema(Joi.string().max(1024));
      });

      it('must be less than or equal to 1024 characters long', () => {
        const reallyLongStr = crypto.randomBytes(1025).toString('hex');
        expect(reallyLongStr).not.toMatchSchema(Joi.string().max(1024));
      });
    });

    describe('mimeType', () => {
      const mimeType = query.keys.mimeType;

      it('is a string', () => {
        expect(mimeType).toBeTruthy();
        expect(mimeType.type).toEqual('string');
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(mimeType.rules)).toBeTruthy();
        expect(mimeType.rules).toHaveLength(1);
        expect(mimeType.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'limit': 255
            },
            'name': 'max'
          }),
        ]));
      });

      it('matches the schema', () => {
        expect('image/jpeg').toMatchSchema(Joi.string().max(255));
      });

      it('must be less than or equal to 255 characters long', () => {
        const longStr = crypto.randomBytes(256).toString('hex');
        expect(longStr).not.toMatchSchema(Joi.string().max(255));
      });
    });

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset().describe());
      });
    });

    describe('public', () => {
      const publicKey = query.keys.public;

      it('is the expected schema', () => {
        expect(publicKey).toEqual(type.truthy.describe());
      });
    });

    describe('active', () => {
      const active = query.keys.active;

      it('is the expected schema', () => {
        expect(active).toEqual(type.truthy.describe());
      });
    });

    describe('page', () => {
      const page = query.keys.page;

      it('is a number', () => {
        expect(page.type).toEqual('alternatives');
        expect(page.matches).toBeTruthy();
      });

      it('enforces min value 1', () => {
        expect.objectContaining({
          name: 'min',
          args: expect.objectContaining({
            limit: 1
          })
        });
      });
    });

    describe('limit', () => {
      const limit = query.keys.limit;

      it('is a number', () => {
        expect(limit.type).toEqual('alternatives');
        expect(limit.matches).toBeTruthy();
      });

      it('enforces min value 0', () => {
        expect.objectContaining({
          name: 'min',
          args: expect.objectContaining({
            limit: 0
          })
        });
      });

      it('limit is provided and greater then or equal to 0', () => {
        const limitObject = schema.searchObjects.query;
        const result = limitObject.validate({
          limit: 0
        });
        expect(result.value.limit).toBeGreaterThanOrEqual(0);
      });
    });

    describe('sort', () => {
      const sort = query.keys.sort;
      const sortName = ['id', 'path', 'public', 'active', 'createdBy', 'updatedBy', 'updatedAt', 'bucketId', 'name'];

      it('is a string', () => {
        expect(sort.type).toEqual('string');
      });

      it('must be one of ' + sortName, () => {
        expect(sort.allow).toEqual(
          expect.arrayContaining(sortName)
        );
      });
    });

    describe('order', () => {
      const order = query.keys.order;
      it('is a string', () => {
        expect(order.type).toEqual('string');
      });
      it('allows array containing valid order', () => {
        expect(order.allow).toEqual(
          expect.arrayContaining(Object.values(SortOrder))
        );
      });
    });

    describe('permissions', () => {
      const permissions = query.keys.permissions;

      it('is the expected schema', () => {
        expect(permissions).toEqual(type.truthy.describe());
      });
    });

  });
});

describe('syncObject', () => {

  describe('params', () => {
    const params = schema.syncObject.params.describe();

    describe('bucketId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });
});

describe('togglePublic', () => {

  describe('params', () => {
    const params = schema.togglePublic.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.togglePublic.query.describe();

    describe('public', () => {
      const publicKey = query.keys.public;

      it('is the expected schema', () => {
        expect(publicKey).toEqual(type.truthy.describe());
      });
    });
  });
});


describe('updateObject', () => {

  describe('headers', () => {
    const headers = schema.updateObject.headers.describe();

    it('is the expected schema', () => {
      expect(headers).toEqual(type.metadata().describe());
    });
  });

  describe('params', () => {
    const params = schema.updateObject.params.describe();

    describe('objectId', () => {
      const objectId = params.keys.objectId;

      it('is the expected schema', () => {
        expect(objectId).toEqual(type.uuidv4.required().describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.updateObject.query.describe();

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is the expected schema', () => {
        expect(tagset).toEqual(type.tagset().describe());
      });
    });
  });
});
