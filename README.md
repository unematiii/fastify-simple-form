# fastify-simple-form

Fastify plugin that adds content type parser for the `application/x-www-form-urlencoded` and/or `multipart/form-data` types.

## Description

Essentially a tiny wrapper around [busboy](https://github.com/mscdex/busboy), that parses `application/x-www-form-urlencoded` and/or `multipart/form-data` content types and attaches associated fields to `request.body`.

NB! This plugin does not handle `files`, these get simply discarded as described [here](https://github.com/mscdex/busboy#busboy-special-events).

## Install

```
npm install fastify-simple-form
```

## Usage & Options

### Selectively enable content types to parse

```js
fastify.register(require('fastify-simple-form'), {
  multipart: true,   // Enable parsing for `multipart/form-data`, default: true
  urlencoded: false, // Disable parsing for `application/x-www-form-urlencoded`, default: true
});
```

This plugin has no effect when both options above are set to `false`!

### Options for busboy

Accepts identical options to those of busboy [constructor](https://github.com/mscdex/busboy#busboy-methods) (with the exception of `headers`), e.g.:

```js
fastify.register(require('fastify-simple-form'), {
  defCharset: 'utf8',
  limits: {
    fieldNameSize: 100, // Max field name size (in bytes), default: 100
    fieldSize: 1000000, // Max field value size (in bytes), default: 1MB
    fields: 10,         // Max number of non-file fields, default: Infinity
  },
});
```

### Example

Given server & handler:

```js
import Fastify from 'fastify';
import parseForm from 'fastify-simple-form';

const fastify = Fastify();

fastify.register(parseForm);

fastify.post(
  '/token',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
          },
          password: {
            type: 'string',
          },
          client_id: {
            type: 'string',
            format: 'uuid',
          },
          client_secret: {
            type: 'string',
          },
          refresh_token: {
            type: 'string',
            format: 'uuid',
          },
          grant_type: {
            type: 'string',
            enum: ['authorization_code', 'refresh_token'],
          },
        },
        required: ['grant_type'],
      },
    },
  },
  (request, reply) => {
    reply.send(request.body);
  },
);

fastify.listen(3000);
```

These requests would succeed:

```sh
curl \
  -F "client_id=e52b2864-7611-4f26-94e4-d13f7039f25d" \
  -F "client_secret=rGGb45-awp0Q9X2yP3CxwhP8HhUY8uW1" \
  -F "refresh_token=f5e6ca6e-e2cf-4130-9b3f-26727ca11f78" \
  -F "grant_type=refresh_token" \
  localhost:3000/token
```

```sh
curl \
  -d "client_id=e52b2864-7611-4f26-94e4-d13f7039f25d" \
  -d "client_secret=rGGb45-awp0Q9X2yP3CxwhP8HhUY8uW1" \
  -d "refresh_token=f5e6ca6e-e2cf-4130-9b3f-26727ca11f78" \
  -d "grant_type=refresh_token" \
  localhost:3000/token
```

Response:

```json
{
  "client_id": "e52b2864-7611-4f26-94e4-d13f7039f25d",
  "client_secret": "rGGb45-awp0Q9X2yP3CxwhP8HhUY8uW1",
  "refresh_token": "f5e6ca6e-e2cf-4130-9b3f-26727ca11f78",
  "grant_type": "refresh_token"
}
```

While these won't pass the schema validation

```sh
curl \
  -F "username=jon" \
  -F "password=snow" \
  -F "grant_type=password" \
  localhost:3000/token
```

```sh
curl \
  -d "username=jon" \
  -d "password=snow" \
  -d "grant_type=password" \
  localhost:3000/token
```

Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body.grant_type should be equal to one of the allowed values"
}
```
