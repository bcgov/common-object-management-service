# FROM docker.io/node:16.15.0-alpine # Last known working alpine image

#
# Build the application
#
FROM registry.access.redhat.com/ubi9/nodejs-18:1-17 as builder

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
FROM registry.access.redhat.com/ubi9/nodejs-18-minimal:1-18

ENV APP_PORT=3000 \
    NO_UPDATE_NOTIFIER=true

COPY --from=builder /tmp/src ${HOME}
WORKDIR ${HOME}/app

EXPOSE ${APP_PORT}
CMD ["npm", "run", "start"]
