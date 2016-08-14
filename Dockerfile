FROM nodesource/trusty:6.3.1

RUN mkdir /app
WORKDIR /app
ADD package.json /app/
RUN npm install

ADD config /app/config
ADD src-js /app/src-js
ADD lib /app/lib

CMD ["node", "src-js/index.js"]
