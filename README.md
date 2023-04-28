
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

## Directory Structure

```txt
.github/                   - PR, Issue templates and CI/CD
app/                       - Application Root
├── config/                - configuration exposed as environment variables
├── src/                   - Node.js web application
│   ├── components/        - Components Layer
│   ├── controllers/       - Controller Layer
│   ├── db/                - Database Layer
│   ├── docs/              - OpenAPI 3.0 Specification
│   ├── middleware/        - Middleware Layer
│   ├── routes/            - API Route Layer
│   └── services/          - Services Layer
│   └── validators/        - data validation schemas
└── tests/                 - Node.js web application tests
charts/                    - General Helm Charts
└── coms/                  - COMS Helm Chart Repository
    └── templates/         - COMS Helm Chart Template manifests
k6/                        - sample load testing scripts
bcgovpubcode.yml           - BCGov public code asset tracking
CODE-OF-CONDUCT.md         - Code of Conduct
COMPLIANCE.yaml            - BCGov PIA/STRA compliance status
CONTRIBUTING.md            - Contributing Guidelines
Dockerfile                 - Dockerfile Image definition
LICENSE                    - License
SECURITY.md                - Security Policy and Reporting
```

## Documentation

* [Application Readme](app/README.md)
* [API Specification](app/README.md#openapi-specification)
* [Product Roadmap](https://github.com/bcgov/common-object-management-service/wiki/Product-Roadmap)
* [Product Wiki](https://github.com/bcgov/common-object-management-service/wiki)
* [Security Reporting](SECURITY.md)

## Getting Help or Reporting an Issue

To report bugs/issues/features requests, please file an [issue](https://github.com/bcgov/common-object-management-service/issues).

## How to Contribute

If you would like to contribute, please see our [contributing](CONTRIBUTING.md) guidelines.

Please note that this project is released with a [Contributor Code of Conduct](CODE-OF-CONDUCT.md). By participating in this project you agree to abide by its terms.

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
