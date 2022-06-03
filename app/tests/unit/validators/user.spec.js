const crypto = require('crypto');
const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const schema = require('../../../src/validators/user').schema;

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
      const firstName = query.keys.firstName;

      it('is a string', () => {
        expect(firstName).toBeTruthy();
        expect(firstName.type).toEqual('string');
      });

      it('is a regex', () => {
        expect(Array.isArray(firstName.rules)).toBeTruthy();
        expect(firstName.rules).toHaveLength(2);
        expect(firstName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'regex': '/^[\\w\\-\\s]+$/'
            },
            'name': 'pattern'
          })
        ]));
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(firstName.rules)).toBeTruthy();
        expect(firstName.rules).toHaveLength(2);
        expect(firstName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'limit': 255
            },
            'name': 'max'
          })
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            firstName: 'Bob'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('must be less than or equal to 255 characters long', () => {
        const req =  {
          query: {
            firstName: longStr
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
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
      const identityId = query.keys.identityId;

      it('is an alternatives', () => {
        expect(identityId).toBeTruthy();
        expect(identityId.type).toEqual('alternatives');
        expect(Array.isArray(identityId.matches)).toBeTruthy();
        expect(identityId.matches).toHaveLength(2);
      });

      it('allows array containing guid of type uuidv4', () => {
        expect(identityId.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({
            schema: expect.objectContaining({
              type: 'array',
              items: expect.arrayContaining([
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
              ])
            })
          })
        ]));
      });

      it('allows single guid of type uuidv4', () => {
        expect(identityId.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({
            schema: expect.objectContaining({
              type: 'array',
              items: expect.arrayContaining([
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
              ])
            })
          })
        ]));
      });

      it('matches the schema with array', () => {
        const req =  {
          query: {
            identityId: [
              '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'
            ],
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects the schema with array', () => {
        const req =  {
          query: {
            identityId: [
              '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000',
              'notauuidv4'
            ],
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });

      it('matches the schema with single guid', () => {
        const req =  {
          query: {
            identityId: '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects the schema with incorrect guid', () => {
        const req =  {
          query: {
            identityId: 'notauuidv4'
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('idp', () => {
      const idp = query.keys.idp;

      it('is an alternatives', () => {
        expect(idp).toBeTruthy();
        expect(idp.type).toEqual('alternatives');
        expect(Array.isArray(idp.matches)).toBeTruthy();
        expect(idp.matches).toHaveLength(2);
      });

      it('allows array containing strings with max length 255', () => {
        expect(idp.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({
            schema: expect.objectContaining({
              type: 'array',
              items: expect.arrayContaining([
                expect.objectContaining({
                  type: 'string',
                  rules: expect.arrayContaining([
                    expect.objectContaining({
                      args: {
                        limit: 255
                      },
                      name: 'max',
                    })
                  ])
                })
              ])
            })
          })
        ]));
      });

      it('allows single string with max length 255', () => {
        expect(idp.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({
            schema: expect.objectContaining({
              type: 'array',
              items: expect.arrayContaining([
                expect.objectContaining({
                  type: 'string',
                  rules: expect.arrayContaining([
                    expect.objectContaining({
                      args: {
                        limit: 255
                      },
                      name: 'max',
                    })
                  ])
                })
              ])
            })
          })
        ]));
      });

      it('matches the schema with array', () => {
        const req =  {
          query: {
            idp: [
              'IDIR',
              'BCEID'
            ],
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects  the schema with array', () => {
        const req =  {
          query: {
            idp: [
              123,
              456,
            ],
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });

      it('matches the schema with single value', () => {
        const req =  {
          query: {
            idp: 'IDIR'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects the schema with single value', () => {
        const req =  {
          query: {
            idp: 123
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('lastName', () => {
      const lastName = query.keys.lastName;

      it('is a string', () => {
        expect(lastName).toBeTruthy();
        expect(lastName.type).toEqual('string');
      });

      it('is a regex', () => {
        expect(Array.isArray(lastName.rules)).toBeTruthy();
        expect(lastName.rules).toHaveLength(2);
        expect(lastName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'regex': '/^[\\w\\-\\s]+$/'
            },
            'name': 'pattern'
          })
        ]));
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(lastName.rules)).toBeTruthy();
        expect(lastName.rules).toHaveLength(2);
        expect(lastName.rules).toEqual(expect.arrayContaining([
          expect.objectContaining(
            {
              args: {
                limit: 255
              },
              name: 'max'
            }),
        ]));
      });

      it('matches the schema', () => {
        const req =  {
          query: {
            lastName: 'Smith'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('must be less than or equal to 255 characters long', () => {
        const req =  {
          query: {
            lastName: longStr
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
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

      it('is an alternatives', () => {
        expect(userId).toBeTruthy();
        expect(userId.type).toEqual('alternatives');
        expect(Array.isArray(userId.matches)).toBeTruthy();
        expect(userId.matches).toHaveLength(2);
      });

      it('allows array containing guid of type uuidv4', () => {
        expect(userId.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({
            schema: expect.objectContaining({
              type: 'array',
              items: expect.arrayContaining([
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
              ])
            })
          })
        ]));
      });

      it('allows single guid of type uuidv4', () => {
        expect(userId.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({
            schema: expect.objectContaining({
              type: 'array',
              items: expect.arrayContaining([
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
              ])
            })
          })
        ]));
      });

      it('matches the schema with array', () => {
        const req =  {
          query: {
            userId: [
              '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'
            ],
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects the schema with array', () => {
        const req =  {
          query: {
            userId: [
              '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000',
              'notauuidv4'
            ],
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });

      it('matches the schema with single guid', () => {
        const req =  {
          query: {
            userId: '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('rejects the schema with incorrect guid', () => {
        const req =  {
          query: {
            userId: 'notauuidv4'
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });

    describe('username', () => {
      const username = query.keys.username;

      it('is a string', () => {
        expect(username).toBeTruthy();
        expect(username.type).toEqual('string');
      });

      it('is a regex', () => {
        expect(Array.isArray(username.rules)).toBeTruthy();
        expect(username.rules).toHaveLength(2);
        expect(username.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({
            'args': {
              'regex': '/^[\\w\\-\\s]+$/'
            },
            'name': 'pattern'
          })
        ]));
      });

      it('has a max length of 255', () => {
        expect(Array.isArray(username.rules)).toBeTruthy();
        expect(username.rules).toHaveLength(2);
        expect(username.rules).toEqual(expect.arrayContaining([
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
            username: 'someuser'
          }
        };

        expect(req).toMatchSchema(schema.searchUsers);
      });

      it('must be less than or equal to 255 characters long', () => {
        const req =  {
          query: {
            username: longStr
          }
        };

        expect(req).not.toMatchSchema(schema.searchUsers);
      });
    });
  });
});
