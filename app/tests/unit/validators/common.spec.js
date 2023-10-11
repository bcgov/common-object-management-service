const crypto = require('crypto');
const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { EMAILREGEX, Permissions } = require('../../../src/components/constants');
const { scheme, type } = require('../../../src/validators/common');

describe('type', () => {
  const longStr = crypto.randomBytes(256).toString('hex');

  describe('alphanum', () => {
    const model = type.alphanum.describe();

    it('is a string', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('string');
    });

    it('is an alphanum', () => {
      expect(Array.isArray(model.rules)).toBeTruthy();
      expect(model.rules).toHaveLength(2);
      expect(model.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          'name': 'alphanum'
        })
      ]));
    });

    it('has a max length of 255', () => {
      expect(Array.isArray(model.rules)).toBeTruthy();
      expect(model.rules).toHaveLength(2);
      expect(model.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          'args': {
            'limit': 255
          },
          'name': 'max'
        }),
      ]));
    });

    it('matches the schema', () => {
      expect('someuser').toMatchSchema(type.alphanum);
    });

    it('must be less than or equal to 255 characters long', () => {
      expect(longStr).not.toMatchSchema(type.alphanum);
    });
  });

  describe('email', () => {
    const model = type.email.describe();
    it('is a string', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('string');
    });

    it('is an email', () => {
      expect(Array.isArray(model.rules)).toBeTruthy();
      expect(model.rules).toHaveLength(2);
      expect(model.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          'args': {
            'regex': new RegExp(EMAILREGEX).toString()
          },
          'name': 'pattern'
        }),
        expect.objectContaining({
          'args': {
            'limit': 255
          },
          'name': 'max'
        })
      ]));
    });

    it('is a string', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('string');
    });

    it('matches the schema', () => {
      expect('test@test.com').toMatchSchema(type.email);
    });

    it('rejects the schema when not a valid email', () => {
      expect('test_at_test_dot_com').not.toMatchSchema(type.email);
    });

    it('is not greater than 255 characters', () => {
      expect(longStr).not.toMatchSchema(type.email);
    });
  });

  describe('truthy', () => {
    const model = type.truthy.describe();

    it('is a boolean', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('boolean');
    });

    it('contains truthy array', () => {
      expect(Array.isArray(model.truthy)).toBeTruthy();
      expect(model.truthy).toHaveLength(12);
    });

    it.each([
      true, 1, 'true', 'TRUE', 't', 'T', 'yes', 'yEs', 'y', 'Y', '1',
      false, 0, 'false', 'FALSE', 'f', 'F', 'no', 'nO', 'n', 'N', '0'
    ])('accepts the schema given %j', (value) => {
      expect(value).toMatchSchema(type.truthy);
    });
  });

  describe('uuidv4', () => {
    const model = type.uuidv4.describe();

    it('is a uuidv4', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('string');
      expect(Array.isArray(model.rules)).toBeTruthy();
      expect(model.rules).toHaveLength(1);
      expect(model.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'guid',
          args: {
            options: { version: 'uuidv4' }
          }
        })
      ]));
    });

    it('matches the schema with single guid', () => {
      expect('11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000').toMatchSchema(type.uuidv4);
    });

    it('rejects the schema with incorrect guid', () => {
      expect('notauuidv4').not.toMatchSchema(type.uuidv4);
    });
  });

  describe('metadata', () => {
    const func = type.metadata(1, 1);
    const model = func.describe();

    it('enforces general metadata pattern', () => {
      expect(model.patterns).toEqual(expect.arrayContaining([
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

  describe('tagset', () => {
    const func = type.tagset({ maxKeyCount: 1, minKeyCount: 1 });
    const model = func.describe();

    it('is an object', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('object');
    });

    it('enforces general tagset pattern', () => {
      expect(model.patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          matches: expect.objectContaining({
            rules: expect.arrayContaining([
              expect.objectContaining({
                name: 'min',
                args: expect.objectContaining({
                  limit: 1
                })
              }),
              expect.objectContaining({
                name: 'max',
                args: expect.objectContaining({
                  limit: 1
                })
              })
            ]),
            type: 'array'
          }),
          regex: '/^(?!coms-id$).{1,255}$/',
          rule: expect.objectContaining({
            type: 'string',
            rules: expect.arrayContaining([
              expect.objectContaining({
                name: 'min',
                args: expect.objectContaining({
                  limit: 0
                })
              }),
              expect.objectContaining({
                name: 'max',
                args: expect.objectContaining({
                  limit: 255
                })
              })
            ]),
          }),
        })
      ]));
    });
  });

});

describe('scheme', () => {

  describe('guid', () => {
    const model = scheme.guid.describe();

    it('is of type alternatives', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('alternatives');
      expect(Array.isArray(model.matches)).toBeTruthy();
      expect(model.matches).toHaveLength(2);
    });

    it('allows array containing guid of type uuidv4', () => {
      expect(model.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({
          schema: expect.objectContaining({
            type: 'csvArray',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'string',
                rules: expect.arrayContaining([
                  expect.objectContaining({
                    name: 'guid',
                    args: {
                      options: { version: 'uuidv4' }
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
      expect(model.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({
          schema: expect.objectContaining({
            type: 'csvArray',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'string',
                rules: expect.arrayContaining([
                  expect.objectContaining({
                    name: 'guid',
                    args: {
                      options: { version: 'uuidv4' }
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
      expect(['11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000']).toMatchSchema(scheme.guid);
    });

    it('rejects the schema with array', () => {
      expect(['11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000', 'notauuidv4']).not.toMatchSchema(scheme.guid);
    });

    it('matches the schema with single guid', () => {
      expect('11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000').toMatchSchema(scheme.guid);
    });

    it('rejects the schema with incorrect guid', () => {
      expect('notauuidv4').not.toMatchSchema(scheme.guid);
    });
  });

  describe('string', () => {
    const model = scheme.string.describe();

    it('is of type alternatives', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('alternatives');
      expect(Array.isArray(model.matches)).toBeTruthy();
      expect(model.matches).toHaveLength(2);
    });

    it('allows array containing strings', () => {
      expect(model.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({
          schema: expect.objectContaining({
            type: 'csvArray',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'string',
                rules: expect.arrayContaining([
                  expect.objectContaining({
                    args: {
                      limit: 255
                    },
                    name: 'max'
                  })
                ])
              })
            ])
          })
        })
      ]));
    });

    it('allows single string', () => {
      expect(model.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({
          schema: expect.objectContaining({
            type: 'csvArray',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'string',
                rules: expect.arrayContaining([
                  expect.objectContaining({
                    args: {
                      limit: 255
                    },
                    name: 'max'
                  })
                ])
              })
            ])
          })
        })
      ]));
    });

    it('matches the schema with array', () => {
      expect(['STRING A', 'STRING B']).toMatchSchema(scheme.string);
    });

    it('rejects the schema with array containing non string', () => {
      expect(['STRING A', 1234]).not.toMatchSchema(scheme.string);
    });

    it('matches the schema with single string', () => {
      expect('STRING A').toMatchSchema(scheme.string);
    });

    it('rejects the schema with non string value', () => {
      expect(1234).not.toMatchSchema(scheme.string);
    });
  });

  describe('permCode', () => {
    const model = scheme.permCode.describe();

    it('is of type alternatives', () => {
      expect(model).toBeTruthy();
      expect(model.type).toEqual('alternatives');
      expect(Array.isArray(model.matches)).toBeTruthy();
      expect(model.matches).toHaveLength(2);
    });

    it('allows array containing valid permCodes', () => {
      expect(model.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({
          schema: expect.objectContaining({
            type: 'csvArray',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'string',
                allow: expect.arrayContaining(Object.values(Permissions))
              })
            ])
          })
        })
      ]));
    });

    it('allows a single valid permCode ', () => {
      expect(model.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({
          schema: expect.objectContaining({
            type: 'csvArray',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'string',
                allow: expect.arrayContaining(Object.values(Permissions))
              })
            ])
          })
        })
      ]));
    });

    it('matches the schema with valid permissions array', () => {
      expect([Permissions.UPDATE, Permissions.READ]).toMatchSchema(scheme.permCode);
    });

    it('rejects the schema with invalid permissions array', () => {
      expect([Permissions.UPDATE, 'BADPERM']).not.toMatchSchema(scheme.permCode);
    });

    it('matches the schema with single permission', () => {
      expect(Permissions.UPDATE).toMatchSchema(scheme.permCode);
    });

    it('rejects the schema with single invalid permission', () => {
      expect('BADPERM').not.toMatchSchema(scheme.permCode);
    });
  });
});
