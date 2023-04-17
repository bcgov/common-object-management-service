import http from 'k6/http';
import { check, sleep } from 'k6';

// multipart file uploads - https://k6.io/docs/examples/data-uploads/#multipart-request-uploading-a-file

// k6 options (https://k6.io/docs/using-k6/k6-options/)
export const options = {
  scenarios: {
    createObject: {
      executor: 'constant-arrival-rate',
      rate: 20, // this is per-second, see "timeUnit" below
      timeUnit: '1s',
      preAllocatedVUs: 1,
      maxVUs: 1,
      duration: '10s',
    },
  },
};

// give objects random tags
const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

// request url
const url = 'http://localhost:3000/api/v1/object?tagset[' + randomLetter + ']=' + randomLetter;

// open() the file as binary (with the 'b' argument).
const binFile = open('./file-in-cur-dir.txt', 'b');

// run k6
export default function () {
  const data = {
    // attach file, specify file name and content type
    file: http.file(binFile, 'name-given-to-file.txt', 'text/plain'),
    field: 'another form field'
  };

  // make the http request
  const res = http.post(url, data, {
    // add headers
    headers: {
      'Authorization': 'Bearer <user ID token here>'
    }
  });

  // tests
  check(res, {
    'is status 201': (r) => r.status === 201,
  })

  // optional delay (per VU) between iterations
  sleep(1);
}
