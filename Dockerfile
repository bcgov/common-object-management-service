# FROM docker.io/node:16.15.0-alpine # Last known working alpine image

# RedHat Image Catalog references
# https://catalog.redhat.com/software/containers/ubi9/nodejs-18/62e8e7ed22d1d3c2dfe2ca01
# https://catalog.redhat.com/software/containers/ubi9/nodejs-18-minimal/62e8e919d4f57d92a9dee838

#
# Build the application
#
FROM registry.access.redhat.com/ubi9/nodejs-18:1-35 as builder

ENV NO_UPDATE_NOTIFIER=true

USER 0
COPY . /tmp/src
WORKDIR /tmp/src/app
RUN chown -R 1001:0 /tmp/src

USER 1001
RUN npm ci

#
# Create the final container image
#
FROM registry.access.redhat.com/ubi9/nodejs-18-minimal:1-36

ENV APP_PORT=3000 \
    NO_UPDATE_NOTIFIER=true

COPY --from=builder /tmp/src ${HOME}
WORKDIR ${HOME}/app

EXPOSE ${APP_PORT}
CMD ["npm", "run", "start"]
