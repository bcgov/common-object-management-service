const crypto = require('crypto');
const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const schema = require('../../../src/validators/user').schema;
const {
  alphanumModel,
  truthyModel,
  uuidv4MultiModel,
  stringMultiModel
} = require('../../../src/validators/common');


describe('listIdps', () => {

  describe('query', () => {
    const query = schema.listIdps.query.describe();

    describe('active', () => {
      const active = query.keys.active;

      it('is a boolean', () => {
        expect(active).toBeTruthy();
        expect(active.type).toEqual('boolean');
      });

      it('contains truthy array', () => {
        expect(Array.isArray(active.truthy)).toBeTruthy();
        expect(active.truthy).toHaveLength(12);
      });

      it.each([
        true, 1, 'true', 'TRUE', 't', 'T', 'yes', 'yEs', 'y', 'Y', '1',
        false, 0, 'false', 'FALSE', 'f', 'F', 'no', 'nO', 'n', 'N', '0'
      ])('accepts the schema given %j', (value) => {
        const req =  {
          query: {
            active: value
          }
        };

        expect(req).toMatchSchema(schema.listIdps);
      });
    });
  });
});

describe('searchUsers', () => {

  describe('query', () => {
    const query = schema.searchUsers.query.describe();
    const longStr = crypto.randomBytes(256).toString('hex');

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

    describe('active', () => {
      const active = query.keys.active;

      it('is the expected schema', () => {
        expect(active).toEqual(truthyModel.describe());
      });
    });

    describe('email', () => {
      const email = query.keys.email;

      it('is a string', () => {
        expect(email).toBeTruthy();
        expect(email.type).toEqual('string');
      });

      it('is an email', () => {
        expect(Array.isArray(email.rules)).toBeTruthy();
        expect(email.rules).toHaveLength(2);
        expect(email.rules).toEqual(expect.arrayContaining([
          expect.objectContaining(
            {
              'args': {
                'limit': 255
              },
              'name': 'max'
            },
            {'name': 'email'})
        ]));
      });

      it('is a string', () => {
        expect(email).toBeTruthy();
        expect(email.type).toEqual('string');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            email: 'test@test.com'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects the schema when not a valid email', () => {
        const req =  {
          query: {
            email: 'test_at_test_dot_com'
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });

      it('is not greater than 255 characters', () => {
        const req =  {
          query: {
            email: longStr
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('firstName', () => {
      it('is the expected schema', () => {
        expect(query.keys.firstName).toEqual(alphanumModel.describe());
      });
    });

    describe('fullName', () => {
      const fullName = query.keys.fullName;

      it('is a string', () => {
        expect(fullName).toBeTruthy();
        expect(fullName.type).toEqual('string');
      });

      it('is a regex', () => {
        expect(Array.isArray(fullName.rules)).toBeTruthy();
        expect(fullName.rules).toHaveLength(2);
        expect(fullName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'regex': '/^[\\w\\-\\s]+$/'
            },
            'name': 'pattern'
          })
        ]));
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(fullName.rules)).toBeTruthy();
        expect(fullName.rules).toHaveLength(2);
        expect(fullName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining(
            {
              'args': {
                'limit': 255
              },
              'name': 'max'
            }),
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            fullName: 'Bob Smith'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('must be less than or equal to 255 characters long', () => {
        const req =  {
          query: {
            fullName: longStr
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('identityId', () => {
      it('is the expected schema', () => {
        expect(query.keys.identityId).toEqual(uuidv4MultiModel.describe());
      });
    });

    describe('idp', () => {
      it('is the expected schema', () => {
        expect(query.keys.idp).toEqual(stringMultiModel.describe());
      });
    });

    describe('lastName', () => {
      it('is the expected schema', () => {
        expect(query.keys.lastName).toEqual(alphanumModel.describe());
      });
    });

    describe('search', () => {
      const search = query.keys.search;

      it('is a string', () => {
        expect(search).toBeTruthy();
        expect(search.type).toEqual('string');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            search: 'someMatcher'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });
    });

    describe('userId', () => {
      const userId = query.keys.userId;

      it('is the expected schema', () => {
        expect(userId).toEqual(uuidv4MultiModel.describe());
      });
    });

    describe('username', () => {
      it('is the expected schema', () => {
        expect(query.keys.username).toEqual(alphanumModel.describe());
      });
    });
  });
});
