const crypto = require('crypto');
const { Joi } = require('express-validation');
const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const schema = require('../../../src/validators/object').schema;
const { scheme, type } = require('../../../src/validators/common');

describe('createObjects', () => {

  describe('headers', () => {
    const headers = schema.createObjects.headers.describe();

    describe('name', () => {
      const name = headers.keys.name;

      it('is the expected schema', () => {
        expect(name).toEqual(type.alphanum.describe());
      });
    });

    describe('stream', () => {
      const stream = headers.keys.stream;

      it('is the expected schema', () => {
        expect(stream).toEqual(type.alphanum.describe());
      });
    });

    describe('info', () => {
      const info = headers.keys.info;

      it('is the expected schema', () => {
        expect(info).toEqual(type.alphanum.describe());
      });
    });
  });
});

describe('deleteObject', () => {

  describe('params', () => {
    const params = schema.deleteObject.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });
});

describe('headObject', () => {

  describe('params', () => {
    const params = schema.headObject.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.headObject.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(type.alphanum.describe());
      });
    });
  });
});

describe('listObjectVersion', () => {

  describe('params', () => {
    const params = schema.listObjectVersion.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });
});

describe('readObject', () => {

  describe('params', () => {
    const params = schema.readObject.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.readObject.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(type.alphanum.describe());
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
        expect(download).toEqual(type.truthy.describe());
      });
    });
  });
});

describe('searchObjects', () => {

  describe('query', () => {
    const query = schema.searchObjects.query.describe();

    describe('objId', () => {
      const objId = query.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(scheme.guid.describe());
      });
    });

    describe('originalName', () => {
      const originalName = query.keys.originalName;

      it('is the expected schema', () => {
        expect(originalName).toEqual(type.alphanum.describe());
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
  });
});


describe('togglePublic', () => {

  describe('params', () => {
    const params = schema.togglePublic.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
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

  describe('params', () => {
    const params = schema.togglePublic.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('headers', () => {
    const headers = schema.updateObject.headers.describe();

    describe('name', () => {
      const name = headers.keys.name;

      it('is the expected schema', () => {
        expect(name).toEqual(type.alphanum.describe());
      });
    });

    describe('stream', () => {
      const stream = headers.keys.stream;

      it('is the expected schema', () => {
        expect(stream).toEqual(type.alphanum.describe());
      });
    });

    describe('info', () => {
      const info = headers.keys.info;

      it('is the expected schema', () => {
        expect(info).toEqual(type.alphanum.describe());
      });
    });
  });
});
