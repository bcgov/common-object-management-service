const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const schema = require('../../../src/validator/user').schema;

describe('searchUsers', () => {

  describe('query', () => {
    const query = schema.searchUsers.query.describe();

    describe('active', () => {
      const active = query.keys.active;

      it('is a boolean', () => {
        expect(active).toBeTruthy();
        expect(active.type).toEqual('boolean');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            active: 'true'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
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
        expect(email.rules).toHaveLength(1);
        expect(email.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({ name: 'email' })
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            email: 'test@test.com'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);

        req.query.email = 'test_at_test_dot_com';
        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('firstName', () => {
      const firstName = query.keys.firstName;

      it('is a string', () => {
        expect(firstName).toBeTruthy();
        expect(firstName.type).toEqual('string');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            firstName: 'Bob'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });
    });

    describe('fullName', () => {
      const fullName = query.keys.fullName;

      it('is a string', () => {
        expect(fullName).toBeTruthy();
        expect(fullName.type).toEqual('string');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            fullName: 'Bob Smith'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });
    });

    describe('identityId', () => {
      const identityId = query.keys.identityId;

      it('is an array', () => {
        expect(identityId).toBeTruthy();
        expect(identityId.type).toEqual('array');
      });

      it('items contain guid of type uuidv4', () => {
        expect(Array.isArray(identityId.items)).toBeTruthy();
        expect(identityId.items).toHaveLength(1);
        expect(identityId.items).toEqual(expect.arrayContaining([
          expect.objectContaining({
            type: 'string',
            rules: expect.arrayContaining([
              expect.objectContaining({
                name: 'guid',
                args: {
                  options: { version: 'uuidv4'}
                }
              })
            ])
          })
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            identityId: [
              '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'
            ],
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
        req.query.identityId = [
          '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000',
          'notauuidv4'
        ];
        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('idp', () => {
      const idp = query.keys.idp;

      it('is an array', () => {
        expect(idp).toBeTruthy();
        expect(idp.type).toEqual('array');
      });

      it('items contain string', () => {
        expect(Array.isArray(idp.items)).toBeTruthy();
        expect(idp.items).toEqual(expect.arrayContaining([
          expect.objectContaining({ type: 'string' })
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            idp: [
              'IDIR',
              'BCEID'
            ],
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
        req.query.idp = [
          123,
          456,
        ];
        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('lastName', () => {
      const lastName = query.keys.lastName;

      it('is a string', () => {
        expect(lastName).toBeTruthy();
        expect(lastName.type).toEqual('string');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            lastName: 'Smith'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
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

      it('is an array', () => {
        expect(userId).toBeTruthy();
        expect(userId.type).toEqual('array');
      });

      it('items contain guid of type uuidv4', () => {
        expect(Array.isArray(userId.items)).toBeTruthy();
        expect(userId.items).toHaveLength(1);
        expect(userId.items).toEqual(expect.arrayContaining([
          expect.objectContaining({
            type: 'string',
            rules: expect.arrayContaining([
              expect.objectContaining({
                name: 'guid',
                args: {
                  options: { version: 'uuidv4'}
                }
              })
            ])
          })
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            userId: [
              '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'
            ],
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
        req.query.userId = [
          '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000',
          'notauuidv4'
        ];
        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('username', () => {
      const username = query.keys.username;

      it('is a string', () => {
        expect(username).toBeTruthy();
        expect(username.type).toEqual('string');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            username: 'someuser'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });
    });
  });
});

describe('listIdps', () => {

  describe('query', () => {
    const query = schema.listIdps.query.describe();

    describe('active', () => {
      const active = query.keys.active;

      it('is a boolean', () => {
        expect(active).toBeTruthy();
        expect(active.type).toEqual('boolean');
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            active: 'true'
          }
        };

        expect(req).toMatchSchema(schema.listIdps);
      });
    });
  });
});
