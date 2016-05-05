FROM nodesource/trusty:5.11.0

RUN mkdir /app
WORKDIR /app
ADD package.json /app/
RUN npm install

ADD config /app/config
ADD src /app/src

CMD ["node", "--harmony_destructuring", "--harmony_default_parameters", "src/index.js"]
