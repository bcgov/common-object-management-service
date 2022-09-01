const crypto = require('crypto');
const { Joi } = require('express-validation');
const jestJoi = require('jest-joi');
const { DownloadMode } = require('../../../src/components/constants');
expect.extend(jestJoi.matchers);

const schema = require('../../../src/validators/object').schema;
const { scheme, type } = require('../../../src/validators/common');


describe('addMetadata', () => {

  describe('headers', () => {
    const headers = schema.addMetadata.headers.describe();

    it('enforces general metadata pattern', () => {
      expect(headers.patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          regex: '/^x-amz-meta-.{1,255}$/i',
          rule: expect.objectContaining({
            type: 'string',
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
                  limit: 255
                })
              })
            ])
          })
        })
      ]));
    });
  });

  describe('params', () => {
    const params = schema.addMetadata.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.addMetadata.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(Joi.string().describe());
      });
    });
  });
});

describe('addTags', () => {

  describe('params', () => {
    const params = schema.addTags.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.addTags.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(Joi.string().describe());
      });
    });

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is an object', () => {
        expect(tagset).toBeTruthy();
        expect(tagset.type).toEqual('object');
      });

      it('enforces general tagset pattern', () => {
        expect(tagset.patterns).toEqual(expect.arrayContaining([
          expect.objectContaining({
            regex: '/^.{1,128}$/',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
                  })
                })
              ])
            })
          })
        ]));
      });
    });
  });
});

describe('createObject', () => {

  describe('headers', () => {
    const headers = schema.createObjects.headers.describe();

    it('enforces general metadata pattern', () => {
      expect(headers.patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          regex: '/^x-amz-meta-.{1,255}$/i',
          rule: expect.objectContaining({
            type: 'string',
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
                  limit: 255
                })
              })
            ])
          })
        })
      ]));
    });
  });

  describe('params', () => {
    const params = schema.createObjects.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.createObjects.query.describe();

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is an object', () => {
        expect(tagset).toBeTruthy();
        expect(tagset.type).toEqual('object');
      });

      it('enforces general tagset pattern', () => {
        expect(tagset.patterns).toEqual(expect.arrayContaining([
          expect.objectContaining({
            regex: '/^.{1,128}$/',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
                  })
                })
              ])
            })
          })
        ]));
      });
    });
  });
});

describe('deleteMetadata', () => {

  describe('headers', () => {
    const headers = schema.deleteMetadata.headers.describe();

    it('enforces general metadata pattern', () => {
      expect(headers.patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          regex: '/^x-amz-meta-.{1,255}$/i',
          rule: expect.objectContaining({
            type: 'string',
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
                  limit: 255
                })
              })
            ])
          })
        })
      ]));
    });
  });

  describe('params', () => {
    const params = schema.deleteMetadata.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.deleteMetadata.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(Joi.string().describe());
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

  describe('query', () => {
    const query = schema.deleteObject.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(Joi.string().describe());
      });
    });
  });
});

describe('deleteTags', () => {

  describe('params', () => {
    const params = schema.deleteTags.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.deleteTags.query.describe();

    describe('versionId', () => {
      const versionId = query.keys.versionId;

      it('is the expected schema', () => {
        expect(versionId).toEqual(Joi.string().describe());
      });
    });

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is an object', () => {
        expect(tagset).toBeTruthy();
        expect(tagset.type).toEqual('object');
      });

      it('enforces general tagset pattern', () => {
        expect(tagset.patterns).toEqual(expect.arrayContaining([
          expect.objectContaining({
            regex: '/^.{1,128}$/',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
                  })
                })
              ])
            })
          })
        ]));
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
        expect(versionId).toEqual(Joi.string().describe());
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
        expect(versionId).toEqual(Joi.string().describe());
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

  describe('replaceMetadata', () => {

    describe('headers', () => {
      const headers = schema.replaceMetadata.headers.describe();

      it('enforces general metadata pattern', () => {
        expect(headers.patterns).toEqual(expect.arrayContaining([
          expect.objectContaining({
            regex: '/^x-amz-meta-.{1,255}$/i',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
                  })
                })
              ])
            })
          })
        ]));
      });
    });

    describe('params', () => {
      const params = schema.replaceMetadata.params.describe();

      describe('objId', () => {
        const objId = params.keys.objId;

        it('is the expected schema', () => {
          expect(objId).toEqual(type.uuidv4.describe());
        });
      });
    });

    describe('query', () => {
      const query = schema.replaceMetadata.query.describe();

      describe('versionId', () => {
        const versionId = query.keys.versionId;

        it('is the expected schema', () => {
          expect(versionId).toEqual(Joi.string().describe());
        });
      });
    });
  });


  describe('replaceTags', () => {

    describe('params', () => {
      const params = schema.replaceTags.params.describe();

      describe('objId', () => {
        const objId = params.keys.objId;

        it('is the expected schema', () => {
          expect(objId).toEqual(type.uuidv4.describe());
        });
      });
    });

    describe('query', () => {
      const query = schema.replaceTags.query.describe();

      describe('versionId', () => {
        const versionId = query.keys.versionId;

        it('is the expected schema', () => {
          expect(versionId).toEqual(Joi.string().describe());
        });
      });

      describe('tagset', () => {
        const tagset = query.keys.tagset;

        it('is an object', () => {
          expect(tagset).toBeTruthy();
          expect(tagset.type).toEqual('object');
        });

        it('enforces general tagset pattern', () => {
          expect(tagset.patterns).toEqual(expect.arrayContaining([
            expect.objectContaining({
              regex: '/^.{1,128}$/',
              rule: expect.objectContaining({
                type: 'string',
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
                      limit: 255
                    })
                  })
                ])
              })
            })
          ]));
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
            regex: '/^x-amz-meta-.{1,255}$/i',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
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

      describe('objId', () => {
        const objId = query.keys.objId;

        it('is the expected schema', () => {
          expect(objId).toEqual(scheme.guid.describe());
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

        it('is an object', () => {
          expect(tagset).toBeTruthy();
          expect(tagset.type).toEqual('object');
        });

        it('enforces general tagset pattern', () => {
          expect(tagset.patterns).toEqual(expect.arrayContaining([
            expect.objectContaining({
              regex: '/^.{1,128}$/',
              rule: expect.objectContaining({
                type: 'string',
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
                      limit: 255
                    })
                  })
                ])
              })
            })
          ]));
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

    describe('headers', () => {
      const headers = schema.updateObject.headers.describe();

      it('enforces general metadata pattern', () => {
        expect(headers.patterns).toEqual(expect.arrayContaining([
          expect.objectContaining({
            regex: '/^x-amz-meta-.{1,255}$/i',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
                  })
                })
              ])
            })
          })
        ]));
      });
    });

    describe('params', () => {
      const params = schema.updateObject.params.describe();

      describe('objId', () => {
        const objId = params.keys.objId;

        it('is the expected schema', () => {
          expect(objId).toEqual(type.uuidv4.describe());
        });
      });
    });

    describe('query', () => {
      const query = schema.updateObject.query.describe();

      describe('tagset', () => {
        const tagset = query.keys.tagset;

        it('is an object', () => {
          expect(tagset).toBeTruthy();
          expect(tagset.type).toEqual('object');
        });

        it('enforces general tagset pattern', () => {
          expect(tagset.patterns).toEqual(expect.arrayContaining([
            expect.objectContaining({
              regex: '/^.{1,128}$/',
              rule: expect.objectContaining({
                type: 'string',
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
                      limit: 255
                    })
                  })
                ])
              })
            })
          ]));
        });
      });
    });
  });
});


describe('updateObject', () => {

  describe('headers', () => {
    const headers = schema.updateObject.headers.describe();

    it('enforces general metadata pattern', () => {
      expect(headers.patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          regex: '/^x-amz-meta-.{1,255}$/i',
          rule: expect.objectContaining({
            type: 'string',
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
                  limit: 255
                })
              })
            ])
          })
        })
      ]));
    });
  });

  describe('params', () => {
    const params = schema.updateObject.params.describe();

    describe('objId', () => {
      const objId = params.keys.objId;

      it('is the expected schema', () => {
        expect(objId).toEqual(type.uuidv4.describe());
      });
    });
  });

  describe('query', () => {
    const query = schema.updateObject.query.describe();

    describe('tagset', () => {
      const tagset = query.keys.tagset;

      it('is an object', () => {
        expect(tagset).toBeTruthy();
        expect(tagset.type).toEqual('object');
      });

      it('enforces general tagset pattern', () => {
        expect(tagset.patterns).toEqual(expect.arrayContaining([
          expect.objectContaining({
            regex: '/^.{1,128}$/',
            rule: expect.objectContaining({
              type: 'string',
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
                    limit: 255
                  })
                })
              ])
            })
          })
        ]));
      });
    });
  });
});
