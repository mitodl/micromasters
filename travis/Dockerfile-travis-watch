FROM mitodl/micromasters_watch_travis_ba4c35

WORKDIR /src

COPY package.json /src

COPY yarn.lock /src

ADD ./webpack_if_prod.sh /src

USER node

RUN yarn install --frozen-lockfile

COPY . /src

USER root

RUN chown -R node:node /src

USER node
