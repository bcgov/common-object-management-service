const request = require('supertest');

const { expressHelper } = require('../../../common/helper');
const router = require('../../../../src/routes/v1/object');

const { objectController } = require('../../../../src/controllers');

// Express Server
const basePath = '/api/v1/object';
const app = expressHelper(basePath, router);


describe(`POST ${basePath}`, () => {
  const spy = jest.spyOn(objectController, 'createObjects');

  beforeEach(() => {
    spy.mockReset();
  });

  it('Should call controller', async () => {
    // eslint-disable-next-line no-unused-vars
    spy.mockImplementation((req, res, next) => res.status(200).end());
    await request(app).post(`${basePath}`);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});