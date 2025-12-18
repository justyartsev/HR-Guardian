FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . ./

RUN npm run deploy_build



FROM nginx:stable-alpine

COPY --from=build /app/dist /var/www/static/
COPY ./envchange.sh /var/www/static/
RUN chmod +x /var/www/static/envchange.sh
RUN dos2unix /var/www/static/envchange.sh

COPY ./.nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/var/www/static/envchange.sh"]
