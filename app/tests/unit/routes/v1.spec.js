const request = require('supertest');

const { expressHelper } = require('../../common/helper');
const router = require('../../../src/routes/v1');

// Simple Express Server
const basePath = '/api/v1';
const app = expressHelper(basePath, router);

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

describe(`GET ${basePath}`, () => {
  it('should return all available endpoints', async () => {
    const response = await request(app).get(`${basePath}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeTruthy();
    expect(Array.isArray(response.body.endpoints)).toBeTruthy();
    expect(response.body.endpoints).toHaveLength(7);
    expect(response.body.endpoints).toContain('/bucket');
    expect(response.body.endpoints).toContain('/docs');
    expect(response.body.endpoints).toContain('/metadata');
    expect(response.body.endpoints).toContain('/object');
    expect(response.body.endpoints).toContain('/permission');
    expect(response.body.endpoints).toContain('/user');
  });
});

