# Load testing with K6

[K6](https://k6.io/docs/) is a load testing tool.
Using the K6 command line interface, you can run the scripts found in this directory to test the performance of COMS API features.

Note: It is important to not run load tests against production environments. Always check with your server administrators before load testing in a shared server environment.

## Prerequesites

The simple test scripts (for example: [createObject.js](createObject.js) can be updated with actual values specific to your envionment (for example: your COMS api url, authorization token and bucket ID) or could also pass these values using parameters of the K6 command used to trigger the test. See more K6 details on how [Environment Variables](https://k6.io/docs/using-k6/environment-variables/) work.

### Command example

`k6 run -e BUCKET_ID=41046be7-43d8-486f-a97e-ee360043d454 -e API_PATH=http://localhost:3000/api/v1 -e AUTH_TOKEN=dXNlcjE6cGFzczE= -e FILE_PATH=./file.txt --vus=1 --iterations=1 createObject.js`
