import http from 'k6/http';
import { check, sleep } from 'k6';

// -------------------------------------------------------------------------------------------------
// Init
// -------------------------------------------------------------------------------------------------
// https://k6.io/docs/using-k6/environment-variables

const apiPath = `${__ENV.API_PATH}`
const bucketId = `${__ENV.BUCKET_ID}`
const filePath = `${__ENV.FILE_PATH}`
const authToken = `${__ENV.AUTH_TOKEN}`

'./file-in-cur-dir.txt'

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

// open() the file as binary (with the 'b' argument, must be declared in init scope)
// ref: https://k6.io/docs/examples/data-uploads/#multipart-request-uploading-a-file
// eslint-disable-next-line
const binFile = open(filePath, 'b');

// run k6
export default function () {

  // create url with random tags
  const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const url = `${apiPath}/object?bucketId=${bucketId}&tagset[${randomLetter()}]=${randomLetter()}`;

  // create a random file name
  function randomFilename(length) {
    let randomFilename = '';
    let counter = 0;
    while (counter < 6) {
      randomFilename += randomLetter();
      counter += 1;
    }
    return randomFilename + '.txt';
  }

  const data = {
    // attach file, specify file name and content type
    file: http.file(binFile, randomFilename(), 'text/plain')
  };
  // make the http request
  const res = http.put(url, data, {
    // Add Authorization header
    // note: you can hardcode an auth token here or pass it as a paramter
    headers: {
      'Authorization': `Basic ${authToken}`,
      'Content-Disposition': 'attachment; filename="' + randomFilename() + '"',
      'Content-Type': 'text/plain'
    }
  });
  // tests
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  // optional delay (per VU) between iterations
  sleep(1);
}
