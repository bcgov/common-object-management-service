import http from 'k6/http';
import { check, sleep } from 'k6';

// -------------------------------------------------------------------------------------------------
// Init
// -------------------------------------------------------------------------------------------------
// https://k6.io/docs/using-k6/environment-variables

const apiPath = `${__ENV.API_PATH}`
const bucketId = `${__ENV.BUCKET_ID}`
const authToken = `${__ENV.AUTH_TOKEN}`

// k6 options (https://k6.io/docs/using-k6/k6-options/)
export const options = {
  // --- smoke testing (acceptable response times)
  vus: 100,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
  },
};

const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
const url = `${apiPath}/object?bucketId=${bucketId}&latest=true&deleteMarker=false&tagset[${randomLetter}]=${randomLetter}`;

// Add Authorization header
// note: you can hardcode an auth token here or pass it as a paramter
const params = {
  headers: {
    'Authorization': `Basic ${authToken}`
  }
};

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
