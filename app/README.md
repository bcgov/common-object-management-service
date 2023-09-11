# Common Object Management Service

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE) [![Lifecycle:Stable](https://img.shields.io/badge/Lifecycle-Stable-97ca00)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)

![Tests](https://github.com/bcgov/common-object-management-service/workflows/Tests/badge.svg)
[![Maintainability](https://api.codeclimate.com/v1/badges/91d2b0aebc348a1d5d0a/maintainability)](https://codeclimate.com/github/bcgov/common-object-management-service/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/91d2b0aebc348a1d5d0a/test_coverage)](https://codeclimate.com/github/bcgov/common-object-management-service/test_coverage)

[![version](https://img.shields.io/docker/v/bcgovimages/common-object-management-service.svg?sort=semver)](https://hub.docker.com/r/bcgovimages/common-object-management-service)
[![pulls](https://img.shields.io/docker/pulls/bcgovimages/common-object-management-service.svg)](https://hub.docker.com/r/bcgovimages/common-object-management-service)
[![size](https://img.shields.io/docker/image-size/bcgovimages/common-object-management-service.svg)](https://hub.docker.com/r/bcgovimages/common-object-management-service)

A microservice for managing access control to S3 Objects

To learn more about the **Common Services** available visit the [Common Services Showcase](https://bcgov.github.io/common-service-showcase/) page.

## Table of Contents

- [OpenAPI Specification](#openapi-specification)
- [Environment Variables](#environment-variables)
  - [Basic Auth Variables](#basic-auth-variables)
  - [Database Variables](#database-variables)
  - [Keycloak Variables](#keycloak-variables)
  - [Object Storage Variables](#object-storage-variables)
  - [Server Variables](#server-variables)
- [Quick Start](#quick-start)
  - [Docker](#docker)
  - [Local Machine](#local-machine)
- [License](#license)

## OpenAPI Specification

This API is defined and described in OpenAPI 3.0 specification.

When the API is running, you should be able to view the specification through ReDoc at <http://localhost:3000/api/v1/docs> (assuming you are running this microservice locally). The specification source file can be found [here](src/docs/v1.api-spec.yaml)

## Environment Variables

COMS supports a large array of environment variables to configure how it will behave. Depending on which sections below are enabled, you will have certain subsets of functionality available. Visit our wiki documentation on [Authentication modes](https://github.com/bcgov/common-object-management-service/wiki/Deployment-Guide#authentication-modes) for more details on the impacts of enabling each section.

### Basic Auth Variables

The following variables enable and enforce the use of Basic Authentication for requests to COMS

| Config Var | Env Var | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `BASICAUTH_ENABLED` | | Whether to run COMS in Basic Auth mode |
| `username` | `BASICAUTH_USERNAME` | | An arbitrary Username provided in a Basic Auth header of requests from your COMS client application |
| `password` | `BASICAUTH_PASSWORD` | | An arbitrary Password provided in a Basic Auth header of requests from your COMS client application |

### Database Variables

The following variables configure the use of a backend database to support user-based access control, tagging and other advanced features

| Config Var | Env Var | Default | Notes |
| --- | --- | --- | --- |
| `database` | `DB_DATABASE` | coms | COMS database name |
| `host` | `DB_HOST` | localhost | Database conection hostname |
| `username` | `DB_USERNAME` | app | Database account username |
| `password` | `DB_PASSWORD` | | Database account password |
| `port` | `DB_PORT` | 5432 | Database connection port |
| `poolMin` | `DB_POOL_MIN` | 2 | avalable connections |
| `poolMax` | `DB_POOL_MAX` | 10 | available connections |

### Keycloak Variables

The following variables enable and enforce the use of OIDC Bearer Authentication for requests to COMS

| Config Var | Env Var | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `KC_ENABLED` | | Whether to run COMS in OIDC mode, required for user-based access controls and integration with OIDC users |
| `clientId` | `KC_CLIENTID` | | Keycloak service client ID for COMS  |
| `clientSecret` | `KC_CLIENTSECRET` | | Keycloak service client secret |
| `identityKey` | `KC_IDENTITYKEY` | | Specify using alternative JWT claims for user identification instead of the standard jwt.sub. Multiple claim attributes may be specified via a comma-separated list. COMS will attempt to search for the custom claim ordered based on how it is specified in this variable before falling back to jwt.sub if none are found. |
| `publicKey` | `KC_PUBLICKEY` | | If specified, verify all incoming JWT signatures off of the provided public key |
| `realm` | `KC_REALM` | | Keycloak realm ID for COMS |
| `serverUrl` | `KC_SERVERURL` | | Keycloak server url for COMS authentication |

### Object Storage Variables

The following variables enable and enforce the use of OIDC Bearer Authentication for requests to COMS

| Config Var | Env Var | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `OBJECTSTORAGE_ENABLED` | | Whether to run COMS with a default bucket |
| `accessKeyId` | `OBJECTSTORAGE_ACCESSKEYID` | | The Access Key for your S3 compatible object storage account  |
| `bucket` | `OBJECTSTORAGE_BUCKET` | | The object storage bucket name |
| `endpoint` | `OBJECTSTORAGE_ENDPOINT` | | Object store URL. eg: `https://nrs.objectstore.gov.bc.ca` |
| `key` | `OBJECTSTORAGE_KEY` | | The base path for storage location |
| `secretAccessKey` | `OBJECTSTORAGE_SECRETACCESSKEY` | | The Secret Access Key for your S3 compatible object storage account |

### Server Variables

The following variables alter the general Express application behavior. For most situations, the defaults should be sufficient.

| Config Var | Env Var | Default | Notes |
| --- | --- | --- | --- |
| `bodyLimit` | `SERVER_BODYLIMIT` | 30mb | Maximum body size accepted for parsing to JSON body |
| `defaultTempExpiresIn` | `SERVER_TEMP_EXPIRESIN` | 300 | The expiry time for pre-signed S3 URLs to objects in seconds  |
| `logFile` | `SERVER_LOGFILE` | | Writes logs to the following file only if defined |
| `logLevel` | `SERVER_LOGLEVEL` | http | The logging level of COMS |
| `passphrase` | `SERVER_PASSPHRASE` | | A key to encrypt/decrypt bucket secretAccessKey's saved to the database |
| `port` | `SERVER_PORT` | 3000 | The port that COMS application will bind to |
| `privacyMask` | `SERVER_PRIVACY_MASK` | | Strict content privacy controls |

## Quick Start

The following sections provide you a quick way to get COMS set up and running either through Docker or directly as a node application.

### Docker

This section assumes you have a recent version of Docker available to work with on your environment. Make sure to have an understanding of what environment variables are passed into the application before proceeding.

Note: change the `latest` tag to specific version if needed. Avoid using the latest tag in Production to ensure consistency with your existing infrastructure.

Get COMS image:

``` sh
docker pull docker.io/bcgovimages/common-object-management-service:latest
```

Run COMS in **Unauthenticated mode** (replace environment values as necessary)

``` sh
docker run -it --rm -p 3000:3000 \
  -e OBJECTSTORAGE_ENABLED=true \
  -e OBJECTSTORAGE_ACCESSKEYID=<Access Key ID for your S3 account> \
  -e OBJECTSTORAGE_BUCKET=<Object storage bucket name> \
  -e OBJECTSTORAGE_ENDPOINT=<Object store URL. eg: https://nrs.objectstore.gov.bc.ca> \
  -e OBJECTSTORAGE_KEY=<base path for storage location> \
  -e OBJECTSTORAGE_SECRETACCESSKEY=<Secret Access Key for your S3 compatible object storage account> \
  docker.io/bcgovimages/common-object-management-service:latest
```

Run COMS in **Basic Auth mode** (replace environment values as necessary)

``` sh
docker run -it --rm -p 3000:3000 \
  -e OBJECTSTORAGE_ENABLED=true \
  -e OBJECTSTORAGE_ACCESSKEYID=<Access Key ID for your S3 account> \
  -e OBJECTSTORAGE_BUCKET=<Object storage bucket name> \
  -e OBJECTSTORAGE_ENDPOINT=<Object store URL. eg: https://nrs.objectstore.gov.bc.ca> \
  -e OBJECTSTORAGE_KEY=<base path for storage location> \
  -e OBJECTSTORAGE_SECRETACCESSKEY=<Secret Access Key for your S3 compatible object storage account> \
  -e BASICAUTH_ENABLED=true \
  -e BASICAUTH_USERNAME=<Your chosen Basic Auth Username> \
  -e BASICAUTH_PASSWORD=<Your chosen Basic Auth Password> \
  docker.io/bcgovimages/common-object-management-service:latest
```

---

Before running the application, you must make sure that your database is up to date with the latest schema migration. Run the following first before starting up the COMS app as a maintenance task:

``` sh
docker run -it --rm --entrypoint '/bin/sh' -c 'npm run migrate' \
  docker.io/bcgovimages/common-object-management-service:latest
```

Run COMS in **OIDC Auth Mode** (replace environment values as necessary)

``` sh
docker run -it --rm -p 3000:3000 \
  -e OBJECTSTORAGE_ENABLED=true \
  -e OBJECTSTORAGE_ACCESSKEYID=<Access Key ID for your S3 account> \
  -e OBJECTSTORAGE_BUCKET=<Object storage bucket name> \
  -e OBJECTSTORAGE_ENDPOINT=<Object store URL. eg: https://nrs.objectstore.gov.bc.ca> \
  -e OBJECTSTORAGE_KEY=<base path for storage location> \
  -e OBJECTSTORAGE_SECRETACCESSKEY=<Secret Access Key for your S3 compatible object storage account> \
  -e KC_ENABLED=true \
  -e KC_CLIENTID=<id> \
  -e KC_CLIENTSECRET=<secret> \
  -e KC_PUBLICKEY=<publickey> \
  -e KC_REALM=<realm> \
  -e KC_SERVERURL=<url> \
  -e DB_PASSWORD=<password> \
  -e DB_PORT=<your postgres database port> \
  docker.io/bcgovimages/common-object-management-service:latest
```

Run COMS in **Full Auth Mode** (replace environment values as necessary)

``` sh
docker run -it --rm -p 3000:3000 \
  -e OBJECTSTORAGE_ENABLED=true \
  -e OBJECTSTORAGE_ACCESSKEYID=<Access Key ID for your S3 account> \
  -e OBJECTSTORAGE_BUCKET=<Object storage bucket name> \
  -e OBJECTSTORAGE_ENDPOINT=<Object store URL. eg: https://nrs.objectstore.gov.bc.ca> \
  -e OBJECTSTORAGE_KEY=<base path for storage location> \
  -e OBJECTSTORAGE_SECRETACCESSKEY=<Secret Access Key for your S3 compatible object storage account> \
  -e BASICAUTH_ENABLED=true \
  -e BASICAUTH_USERNAME=<Your chosen Basic Auth Username> \
  -e BASICAUTH_PASSWORD=<Your chosen Basic Auth Password> \
  -e KC_ENABLED=true \
  -e KC_CLIENTID=<id> \
  -e KC_CLIENTSECRET=<secret> \
  -e KC_PUBLICKEY=<publickey> \
  -e KC_REALM=<realm> \
  -e KC_SERVERURL=<url> \
  -e DB_PASSWORD=<password> \
  -e DB_PORT=<your postgres database port> \
  docker.io/bcgovimages/common-object-management-service:latest
```

### Local Machine

This section assumes you have a recent version of Node.js (12.x or higher) installed as well as Postgres (12.x or higher). Make sure to have an understanding of what environment variables are passed into the application before proceeding.

#### Configuration

Configuration management is done using the [config](https://www.npmjs.com/package/config) library. There are two ways to configure:

1. Configure via `local.json` file. Look at [custom-environment-variables.json](/app/config/custom-environment-variables.json) and ensure you have the environment variables locally set. Create a `local.json` file in the config folder. This file should never be added to source control. Consider creating a `local-test.json` file in the config folder if you want to use different configurations while running unit tests.
2. Configure via environment variables. Look at [custom-environment-variables.json](/app/config/custom-environment-variables.json) and use the explicit environment variables in your environment as mentioned [above](#environment-variables) to configure your application behavior.

For more information on how the config library loads and searches for environment variables, take a look [here](https://github.com/lorenwest/node-config/wiki/Configuration-Files).

At a minimum (when running COMS in 'Unauthenticated mode'), you are required to have configuration values for your Object Storage.
To run COMS in Full Auth mode you will want your `local.json` to have the following values defined, with your own values as needed:

``` json
{
  "basicAuth": {
    "enabled": true,
    "username": "<Your chosen Basic Auth Username>",
    "password": "<Your chosen Basic Auth Password>"
  },
  "db": {
    "username": "<COMS database username>",
    "password": "<COMS database user password>",
    "port": "<COMS database port. eg 5432>"
  },
  "keycloak": {
    "enabled": true,
    "clientId": "<OIDC client ID>",
    "clientSecret": "<OIDC client secret>",
    "realm": "<OIDC realm ID>",
    "serverUrl": "<OIDC server auth URL>"
  },
  "objectStorage": {
    "enabled": true,
    "secretAccessKey": "<Secret Access Key for your S3 compatible object storage account>",
    "key": "<base path for storage location>",
    "accessKeyId": "<Access Key ID for your S3 account>",
    "bucket": "<Object storage bucket name>",
    "endpoint": "<Object store URL. eg: https://nrs.objectstore.gov.bc.ca>"
  },
  "server": {
    "port": "<The port that COMS application will bind to>"
  }
}
```

#### Database Setup

Before starting up the COMS app, run the following command to ensure your database is up to date with the latest database schema migration:

``` sh
npm run migrate
```

#### Common Commands

Install node dependencies with `npm ci`. You may use `npm install` if you are updating or changing the dependencies instead. Once your application is configured, make sure to run a database migration before starting up the COMS application.

Run the server with hot-reloading for development

``` sh
npm run serve
```

Run the server

``` sh
npm run start
```

Migrate Database

``` sh
npm run migrate
```

Lint the codebase

``` sh
npm run lint
```

Run your tests

``` sh
npm run test
```

## License

```txt
Copyright 2022 Province of British Columbia

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
