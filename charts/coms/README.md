# common-object-management-service

![Version: 0.0.22](https://img.shields.io/badge/Version-0.0.22-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.8.0](https://img.shields.io/badge/AppVersion-0.8.0-informational?style=flat-square)

A microservice for managing access control to S3 Objects

**Homepage:** <https://bcgov.github.io/common-object-management-service>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| NR Common Service Showcase Team | <NR.CommonServiceShowcase@gov.bc.ca> | <https://bcgov.github.io/common-service-showcase/team.html> |

## Source Code

* <https://github.com/bcgov/common-object-management-service>

## Requirements

Kubernetes: `>= 1.13.0`

| Repository | Name | Version |
|------------|------|---------|
| https://bcgov.github.io/nr-patroni-chart | patroni | ~0.0.4 |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| autoscaling.behavior | object | `{"scaleDown":{"policies":[{"periodSeconds":120,"type":"Pods","value":1}],"selectPolicy":"Max","stabilizationWindowSeconds":120},"scaleUp":{"policies":[{"periodSeconds":30,"type":"Pods","value":2}],"selectPolicy":"Max","stabilizationWindowSeconds":0}}` | behavior configures the scaling behavior of the target in both Up and Down directions (scaleUp and scaleDown fields respectively). |
| autoscaling.enabled | bool | `false` | Specifies whether the Horizontal Pod Autoscaler should be created |
| autoscaling.maxReplicas | int | `16` |  |
| autoscaling.minReplicas | int | `2` |  |
| autoscaling.targetCPUUtilizationPercentage | int | `80` |  |
| basicAuthSecretOverride.password | string | `nil` | Basic authentication password |
| basicAuthSecretOverride.username | string | `nil` | Basic authentication username |
| config.configMap | object | `{"DB_PORT":"5432","KC_IDENTITYKEY":null,"KC_PUBLICKEY":null,"KC_REALM":null,"KC_SERVERURL":null,"OBJECTSTORAGE_BUCKET":null,"OBJECTSTORAGE_ENDPOINT":null,"OBJECTSTORAGE_KEY":null,"SERVER_LOGLEVEL":"http","SERVER_PORT":"3000","SERVER_TEMP_EXPIRESIN":"300"}` | These values will be wholesale added to the configmap as is; refer to the coms documentation for what each of these values mean and whether you need them defined. Ensure that all values are represented explicitly as strings, as non-string values will not translate over as expected into container environment variables. For configuration keys named `*_ENABLED`, either leave them commented/undefined, or set them to string value "true". |
| config.enabled | bool | `false` | Set to true if you want to let Helm manage and overwrite your configmaps. |
| config.releaseScoped | bool | `false` | This should be set to true if and only if you require configmaps and secrets to be release scoped. In the event you want all instances in the same namespace to share a similar configuration, this should be set to false |
| dbSecretOverride.password | string | `nil` | Database password |
| dbSecretOverride.username | string | `nil` | Database username |
| failurePolicy | string | `"Retry"` |  |
| features.basicAuth | bool | `false` | Specifies whether basic auth is enabled |
| features.defaultBucket | bool | `false` | Specifies whether a default bucket is enabled |
| features.oidcAuth | bool | `false` | Specifies whether oidc auth is enabled |
| fullnameOverride | string | `nil` | String to fully override fullname |
| image.pullPolicy | string | `"IfNotPresent"` | Default image pull policy |
| image.repository | string | `"docker.io/bcgovimages"` | Default image repository |
| image.tag | string | `nil` | Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` | Specify docker-registry secret names as an array |
| keycloakSecretOverride.password | string | `nil` | Keycloak password |
| keycloakSecretOverride.username | string | `nil` | Keycloak username |
| nameOverride | string | `nil` | String to partially override fullname |
| networkPolicy.enabled | bool | `true` | Specifies whether a network policy should be created |
| objectStorageSecretOverride.password | string | `nil` | Object storage password |
| objectStorageSecretOverride.username | string | `nil` | Object storage username |
| patroni.enabled | bool | `false` | Controls whether to enable managing a Patroni db dependency as a part of the helm release |
| podAnnotations | object | `{}` | Annotations for coms pods |
| podSecurityContext | object | `{}` | Privilege and access control settings |
| replicaCount | int | `2` |  |
| resources.limits.cpu | string | `"200m"` | Limit Peak CPU (in millicores ex. 1000m) |
| resources.limits.memory | string | `"512Mi"` | Limit Peak Memory (in gigabytes Gi or megabytes Mi ex. 2Gi) |
| resources.requests.cpu | string | `"50m"` | Requested CPU (in millicores ex. 500m) |
| resources.requests.memory | string | `"128Mi"` | Requested Memory (in gigabytes Gi or megabytes Mi ex. 500Mi) |
| route.annotations | object | `{}` | Annotations to add to the route |
| route.enabled | bool | `true` | Specifies whether a route should be created |
| route.host | string | `"chart-example.local"` |  |
| route.tls.insecureEdgeTerminationPolicy | string | `"Redirect"` |  |
| route.tls.termination | string | `"edge"` |  |
| route.wildcardPolicy | string | `"None"` |  |
| securityContext | object | `{}` | Privilege and access control settings |
| service.port | int | `3000` | Service port |
| service.portName | string | `"http"` | Service port name |
| service.type | string | `"ClusterIP"` | Service type |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| serviceAccount.enabled | bool | `false` | Specifies whether a service account should be created |
| serviceAccount.name | string | `nil` | The name of the service account to use. If not set and create is true, a name is generated using the fullname template |

----------------------------------------------
An Autogenerated from chart metadata using [helm-docs v1.11.3](https://github.com/norwoodj/helm-docs/releases/v1.11.3)
