import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 options (https://k6.io/docs/using-k6/k6-options/)
export const options = {
  scenarios: {
    createObject: {
      executor: 'constant-arrival-rate',
      rate: 5, // this is per-second, see "timeUnit" below
      timeUnit: '1s',
      preAllocatedVUs: 1,
      maxVUs: 1,
      duration: '10s',
    },
  },
};

const apiPath = 'http://localhost:3000/api/v1';
const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
const bucketId = '<bucket ID (uuid)>';
const url = `${apiPath}/object?bucketId=${bucketId}&tagset[${randomLetter}]=${randomLetter}`;

// open() the file as binary (with the 'b' argument, must be declared in init scope)
// ref: https://k6.io/docs/examples/data-uploads/#multipart-request-uploading-a-file
// eslint-disable-next-line
const binFile = open('./file-in-cur-dir.txt', 'b');

// run k6
export default function () {
  const data = {
    // attach file, specify file name and content type
    file: http.file(binFile, 'abc.txt', 'text/plain')
  };
  // make the http request
  const res = http.post(url, data, {
    // add headers
    headers: {
      'Authorization': 'Bearer <user ID token>'
    }
  });
  // tests
  check(res, {
    'is status 201': (r) => r.status === 201,
  });
  // optional delay (per VU) between iterations
  sleep(1);
}
