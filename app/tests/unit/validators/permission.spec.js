const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const schema = require('../../../src/validators/permission').schema;
const { scheme, type } = require('../../../src/validators/common');
const { Permissions } = require('../../../src/components/constants');


describe('searchPermissions', () => {

  describe('query', () => {
    const query = schema.searchPermissions.query.describe();

    it('requires at least 1 parameter', () => {
      expect(query.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'min',
          args: {
            limit: 1
          }
        })
      ]));
    });

    describe('userId', () => {
      const userId = query.keys.userId;

      it('is the expected schema', () => {
        expect(userId).toEqual(scheme.guid.describe());
      });
    });

    describe('objId', () => {
      const objId = query.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(scheme.guid.describe());
      });
    });

    describe('permCode', () => {
      const permCode = query.keys.permCode;

      it('is the expected schema', () => {
        expect(permCode).toEqual(scheme.permCode.describe());
      });
    });
  });
});

describe('listPermissions', () => {

  describe('query', () => {
    const params = schema.listPermissions.params.describe();
    const query = schema.listPermissions.query.describe();

    describe('userId', () => {
      const userId = query.keys.userId;

      it('is the expected schema', () => {
        expect(userId).toEqual(scheme.guid.describe());
      });
    });

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(scheme.guid.describe());
      });
    });

    describe('permCode', () => {
      const permCode = query.keys.permCode;

      it('is the expected schema', () => {
        expect(permCode).toEqual(scheme.permCode.describe());
      });
    });
  });
});

describe('addPermissions', () => {

  describe('params', () => {
    const params = schema.addPermissions.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('body', () => {
    const body = schema.addPermissions.body.describe();

    it('is an array', () => {
      expect(body).toBeTruthy();
      expect(body.type).toEqual('array');
      expect(Array.isArray(body.items)).toBeTruthy();
    });

    it('is required', () => {
      expect(body.flags).toBeTruthy();
      expect(body.flags).toEqual(expect.objectContaining({ presence: 'required' }));
    });

    it('should contain userId', () => {
      expect(body.items).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keys: expect.objectContaining({
            userId: expect.objectContaining({
              type: 'string',
              flags: expect.objectContaining({ presence: 'required' }),
              rules: expect.arrayContaining([
                expect.objectContaining({
                  name: 'guid',
                  args: {
                    options: { version: 'uuidv4' }
                  }
                })
              ])
            })
          })
        })
      ]));
    });

    it('should contain a valid permCode', () => {
      expect(body.items).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keys: expect.objectContaining({
            permCode: expect.objectContaining({
              type: 'string',
              flags: expect.objectContaining({ presence: 'required' }),
              rules: expect.arrayContaining([
                expect.objectContaining({
                  name: 'max',
                  args: {
                    limit: 255
                  }
                })
              ]),
              allow: expect.arrayContaining(Object.values(Permissions))
            })
          })
        })
      ]));
    });
  });
});

describe('removePermissions', () => {

  describe('params', () => {
    const params = schema.removePermissions.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.listPermissions.query.describe();

    describe('userId', () => {
      const userId = query.keys.userId;

      it('is the expected schema', () => {
        expect(userId).toEqual(scheme.guid.describe());
      });
    });

    describe('permCode', () => {
      const permCode = query.keys.permCode;

      it('is the expected schema', () => {
        expect(permCode).toEqual(scheme.permCode.describe());
      });
    });
  });
});
