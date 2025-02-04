# common-object-management-service

![Version: 2.0.3](https://img.shields.io/badge/Version-2.0.3-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.9.0](https://img.shields.io/badge/AppVersion-0.9.0-informational?style=flat-square)

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
| file://../postgres | postgres(postgrescluster) | 2.0.2 |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| autoscaling.enabled | bool | `false` | Specifies whether the Horizontal Pod Autoscaler should be created |
| autoscaling.maxReplicas | int | `8` |  |
| autoscaling.minReplicas | int | `3` |  |
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
| pdb.enabled | bool | `false` |  |
| pdb.minAvailable | int | `2` |  |
| podAnnotations | object | `{}` | Annotations for coms pods |
| podSecurityContext | object | `{}` | Privilege and access control settings |
| postgres.databaseInitSQL.key | string | `"bootstrap.sql"` |  |
| postgres.databaseInitSQL.name | string | `"bootstrap-sql"` |  |
| postgres.databaseInitSQL.sql | string | `"\\c app;\nALTER DATABASE app OWNER TO app;\nALTER SCHEMA public OWNER TO app;\nREVOKE CREATE ON SCHEMA public FROM PUBLIC;\nCREATE SCHEMA invite;\nALTER SCHEMA invite OWNER TO app;\nCREATE SCHEMA audit;\nALTER SCHEMA audit OWNER TO app;\nCREATE SCHEMA queue;\nALTER SCHEMA queue OWNER TO app;\n"` |  |
| postgres.enabled | bool | `true` |  |
| postgres.instances[0].dataVolumeClaimSpec.accessModes[0] | string | `"ReadWriteOnce"` |  |
| postgres.instances[0].dataVolumeClaimSpec.resources.requests.storage | string | `"1Gi"` |  |
| postgres.instances[0].dataVolumeClaimSpec.storageClassName | string | `"netapp-block-standard"` |  |
| postgres.instances[0].name | string | `"db"` |  |
| postgres.instances[0].replicas | int | `2` |  |
| postgres.instances[0].resources.requests.cpu | string | `"50m"` |  |
| postgres.instances[0].resources.requests.memory | string | `"128Mi"` |  |
| postgres.instances[0].sidecars.replicaCertCopy.resources.requests.cpu | string | `"1m"` |  |
| postgres.instances[0].sidecars.replicaCertCopy.resources.requests.memory | string | `"32Mi"` |  |
| postgres.monitoring | bool | `false` |  |
| postgres.pgBackRestConfig.jobs.resources.requests.cpu | string | `"10m"` |  |
| postgres.pgBackRestConfig.jobs.resources.requests.memory | string | `"64Mi"` |  |
| postgres.pgBackRestConfig.manual.options[0] | string | `"--type=full"` |  |
| postgres.pgBackRestConfig.manual.repoName | string | `"repo1"` |  |
| postgres.pgBackRestConfig.repoHost.resources.requests.cpu | string | `"20m"` |  |
| postgres.pgBackRestConfig.repoHost.resources.requests.memory | string | `"128Mi"` |  |
| postgres.pgBackRestConfig.sidecars.pgbackrest.resources.requests.cpu | string | `"5m"` |  |
| postgres.pgBackRestConfig.sidecars.pgbackrest.resources.requests.memory | string | `"16Mi"` |  |
| postgres.pgBackRestConfig.sidecars.pgbackrestConfig.resources.requests.cpu | string | `"5m"` |  |
| postgres.pgBackRestConfig.sidecars.pgbackrestConfig.resources.requests.memory | string | `"32Mi"` |  |
| postgres.pgBouncerConfig.config.global.client_tls_sslmode | string | `"disable"` |  |
| postgres.pgBouncerConfig.replicas | int | `2` |  |
| postgres.pgBouncerConfig.resources.requests.cpu | string | `"5m"` |  |
| postgres.pgBouncerConfig.resources.requests.memory | string | `"32Mi"` |  |
| postgres.postgresVersion | int | `16` | ------------------------------ note: override methodology: - defaults exist in subchart postgres - overrides that apply to all coms environments are defined in this values.yaml file - overrides specific to a single environment are defined in values.<environment>.yaml name of the cluster. in COMS pipeline we pass this in Helm deploy command in github action eg: --set postgres.name=postgres-master name: postgres-master |
| postgres.users[0].databases[0] | string | `"app"` |  |
| postgres.users[0].name | string | `"app"` |  |
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
Autogenerated from chart metadata using [helm-docs v1.14.2](https://github.com/norwoodj/helm-docs/releases/v1.14.2)
