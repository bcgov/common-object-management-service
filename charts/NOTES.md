# PostreSQL Deployment for the Common Object Management Service

The `postgrescluster` [Helm Chart](https://github.com/bcgov/common-object-management-service/blob/master/charts/postgres/Chart.yaml) is a fork of the official [CrunchyData](https://access.crunchydata.com/documentation/postgres-operator/latest/installation/helm) Helm chart example [version: 5.6.0](https://github.com/CrunchyData/postgres-operator-examples/tree/main/helm/postgres). No changes have been made to the `postgres.yaml` PostgresCluster template or the `values.yaml` files.

2 additional templates have been added to our copy of the repo, that should not need editing, whose values are passed in during deployment:

- `pgbackrest-s3-secret.yaml` to store S3 credentials, should you enable postgres data backeups to S3 using pgBackrest
- `postgres-bootstrap-sql-configmap.yaml` a config map containing any psql commands you want to run when crunchyDB initializes (see `databaseInitSQL` value)

Our pipeline installs the main `coms` Helm chart which has this `postgrescluster` Helm chart as a 'local' dependency. Note, we are using an alias of `postgres` for our postgrescluster chart. The values we pass to this postgrescluster Helm chart are provided in the `postgres` section of our main parent `coms` Helm chart. Our pipeline uses distinct sets of values for each deployment environment. We use this override methodology:

- defaults exist in subchart postgres
- overrides that apply to all coms environments are defined in `charts/coms/values.yaml` file
overrides specific to a single environment are defined in `.github/environments/values.<environment>.yaml`

## Other Things to note

- in COMS pipeline we pass this in Helm deploy command in github action (eg: `--set postgres. name=postgres-master`). This name is required in the postgres templates and becomes the `name` of the PostgresCluster object.

- In our values we provide a `users` object to create a database and user that our COMS app will use.

```yaml
  users:
    - name: app
      databases:
        - app
```

When crunchyDB is installed a secret is created called `postgres-master-pguser-app` that contains postgres credentials that must be referenced in our [COMS deployment template](https://github.com/bcgov/common-object-management-service/blob/921154defa5ba0baa35ed55a4d3436c456017701/charts/coms/templates/deploymentconfig.yaml#L5)

- PR deployments of COMS deploy a dedicated instance of the COMS app in our DEV environment in OPenShift. To reduce server resources, instead of also deploying an extra instance of CrunchyDB, the GitHub action 'On PR Opened' creates a temporary database and user (both named, eg `pr-123`) in the `master` (main) DEV instance of Postgres, that will get dropped when the PR is merged.
