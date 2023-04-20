import http from 'k6/http';
import { check, sleep } from 'k6';

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

// run k6
export default function () {

  const apiPath = 'http://localhost:3000/api/v1';
  // request url
  const url = `${apiPath}/object/<object id here>`;

  const params = {
    headers: {
      'Authorization': 'Bearer <token here>',
    }
  };

  // make the http request
  const res = http.get(url, params);

  // tests
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  // optional delay (per VU) between iterations
  sleep(1);
}
