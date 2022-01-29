FROM docker.io/node:16.13.2-alpine

ARG APP_ROOT=/opt/app-root/src
ENV NO_UPDATE_NOTIFIER=true \
    APP_PORT=3000
WORKDIR ${APP_ROOT}

COPY . .
RUN npm ci

EXPOSE ${APP_PORT}
CMD ["npm", "run", "start"]
