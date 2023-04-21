import http from 'k6/http';
import { check, sleep } from 'k6';

// -------------------------------------------------------------------------------------------------
// Init
// -------------------------------------------------------------------------------------------------
// https://k6.io/docs/using-k6/environment-variables

const apiPath = `${__ENV.API_PATH}`
const objectId = `${__ENV.OBJECT_ID}`
const authToken = `${__ENV.AUTH_TOKEN}`

// k6 options (https://k6.io/docs/using-k6/k6-options/)
export const options = {
  vus: 50,
  scenarios: {
    readObject: {
      executor: 'constant-arrival-rate',
      rate: 20,
      duration: '20s',
      preAllocatedVUs: 50,
      timeUnit: '1s',
      maxVUs: 100,
    },
  },
};

// request url
const url = `${apiPath}/object/${objectId}`;

// Add Authorization header
// note: you can hardcode an auth token here or pass it as a paramter
const params = {
  headers: {
    'Authorization': `Basic ${authToken}`
  }
};

// run k6
export default function () {

  // make the http request
  const res = http.get(url, params);

  // tests
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  // optional delay (per VU) between iterations
  sleep(1);
}
