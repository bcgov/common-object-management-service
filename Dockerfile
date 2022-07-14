FROM docker.io/node:16.15.0-alpine

ARG APP_ROOT=/opt/app-root/src
ENV NO_UPDATE_NOTIFIER=true \
    APP_PORT=3000

COPY . ${APP_ROOT}
WORKDIR ${APP_ROOT}/app
RUN npm ci

EXPOSE ${APP_PORT}
CMD ["npm", "run", "start"]
