const crypto = require('crypto');
const jestJoi = require('jest-joi');
expect.extend(jestJoi.matchers);

const { Permissions } = require('../../../src/components/constants');
const {
  alphanumModel,
  truthyModel,
  uuidv4,
  uuidv4MultiModel,
  stringMultiModel,
  permCodeMultiModel
} = require('../../../src/validators/common');

describe('alphanumModel', () => {
  const model = alphanumModel.describe();

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
    expect('someuser').toMatchSchema(alphanumModel);
  });

  it('must be less than or equal to 255 characters long', () => {
    const longStr = crypto.randomBytes(256).toString('hex');
    expect(longStr).not.toMatchSchema(alphanumModel);
  });
});

describe('truthyModel', () => {
  const model = truthyModel.describe();

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
    expect(value).toMatchSchema(truthyModel);
  });
});

describe('uuidv4', () => {
  const model = uuidv4.describe();

  it('is a uuidv4', () => {
    expect(model).toBeTruthy();
    expect(model.type).toEqual('string');
    expect(Array.isArray(model.rules)).toBeTruthy();
    expect(model.rules).toHaveLength(1);
    expect(model.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'guid',
        args: {
          options: { version: 'uuidv4'}
        }
      })
    ]));
  });

  it('matches the schema with single guid', () => {
    expect('11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000').toMatchSchema(uuidv4);
  });

  it('rejects the schema with incorrect guid', () => {
    expect('notauuidv4').not.toMatchSchema(uuidv4);
  });
});

describe('uuidv4MultiModel', () => {
  const model = uuidv4MultiModel.describe();

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
    expect(model.matches).toEqual(expect.arrayContaining([
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
    expect(['11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000']).toMatchSchema(uuidv4MultiModel);
  });

  it('rejects the schema with array', () => {
    expect(['11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000', 'notauuidv4']).not.toMatchSchema(uuidv4MultiModel);
  });

  it('matches the schema with single guid', () => {
    expect('11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000').toMatchSchema(uuidv4MultiModel);
  });

  it('rejects the schema with incorrect guid', () => {
    expect('notauuidv4').not.toMatchSchema(uuidv4MultiModel);
  });
});

describe('stringMultiModel', () => {
  const model = stringMultiModel.describe();

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
          type: 'array',
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
          type: 'array',
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
    expect(['STRING A', 'STRING B']).toMatchSchema(stringMultiModel);
  });

  it('rejects the schema with array containing non string', () => {
    expect(['STRING A', 1234]).not.toMatchSchema(stringMultiModel);
  });

  it('matches the schema with single string', () => {
    expect('STRING A').toMatchSchema(stringMultiModel);
  });

  it('rejects the schema with non string value', () => {
    expect(1234).not.toMatchSchema(stringMultiModel);
  });
});

describe('permCodeMultiModel', () => {
  const model = permCodeMultiModel.describe();

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
          type: 'array',
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
              ]),
              allow: expect.arrayContaining([
                Permissions.CREATE,
                Permissions.READ,
                Permissions.UPDATE,
                Permissions.DELETE,
                Permissions.MANAGE
              ])
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
          type: 'array',
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
              ]),
              allow: expect.arrayContaining([
                Permissions.CREATE,
                Permissions.READ,
                Permissions.UPDATE,
                Permissions.DELETE,
                Permissions.MANAGE
              ])
            })
          ])
        })
      })
    ]));
  });

  it('matches the schema with valid permissions array', () => {
    expect([Permissions.UPDATE, Permissions.READ]).toMatchSchema(permCodeMultiModel);
  });

  it('rejects the schema with invalid permissions array', () => {
    expect([Permissions.UPDATE, 'BADPERM']).not.toMatchSchema(permCodeMultiModel);
  });

  it('matches the schema with single permission', () => {
    expect(Permissions.UPDATE).toMatchSchema(permCodeMultiModel);
  });

  it('rejects the schema with single invalid permission', () => {
    expect('BADPERM').not.toMatchSchema(permCodeMultiModel);
  });
});
