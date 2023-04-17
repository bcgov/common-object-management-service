import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 options (https://k6.io/docs/using-k6/k6-options/)
export const options = {
  // --- smoke testing (acceptable response times)
  vus: 100,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
  },
};

export default function () {

  // search by random tags
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  // request url
  const url = 'http://localhost:3000/api/v1/object?latest=true&deleteMarker=false&tagset[' + randomLetter + ']=' + randomLetter;

  // Add Authorization header
  const params = {
    headers: {
      'Authorization': 'Bearer <user ID token here>'
    }
  };

  // make the http request
  const res = http.get(url, params);

  // tests
  check(res, {
    'is status 200': (r) => r.status === 200,
  })

  // optional delay (per VU) between iterations
  sleep(1);
}
