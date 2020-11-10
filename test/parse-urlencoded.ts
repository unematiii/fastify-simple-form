import Fastify from 'fastify';
import tap from 'tap';
import urlencoded, { FormEncodedOptions } from 'form-urlencoded';

import SimpleFormPlugin, { FormContentTypes } from '../src';
import { requestA, requestB, requestC, requestD, schema } from './fixtures';

tap.test('should parse content and attach fields to request body', async (tap) => {
  tap.plan(2);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
  });
  instance.post('/', async (request, reply) => {
    tap.same(request.body, requestA);
    reply.send();
  });

  const response = await instance.inject({
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': FormContentTypes.FormUrlencoded,
    },
    payload: urlencoded(requestA),
  });

  tap.equal(response.statusCode, 200);
});

tap.test('should parse duplicate fields as an array', async (tap) => {
  tap.plan(2);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
  });
  instance.post('/', async (request, reply) => {
    tap.same(request.body, requestD);
    reply.send();
  });

  const response = await instance.inject({
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': FormContentTypes.FormUrlencoded,
    },
    payload: urlencoded(requestD, ({ skipIndex: true, skipBracket: true } as unknown) as FormEncodedOptions),
  });

  tap.equal(response.statusCode, 200);
});

tap.test('should parse content, attach fields to request body and trigger schema validation error', async (tap) => {
  tap.plan(6);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
  });
  instance.post('/', {
    schema,
    errorHandler: (error, request, reply) => {
      tap.same(request.body, requestB);
      tap.true(error.validation);
      tap.assert(error.validation?.length == 1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { dataPath, message } = error.validation![0];
      tap.equals(dataPath, '.grant_type');
      tap.equals(message, 'should be equal to one of the allowed values');

      reply.send(error);
    },
    handler: (_, reply) => {
      reply.send();
    },
  });

  const response = await instance.inject({
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': FormContentTypes.FormUrlencoded,
    },
    payload: urlencoded(requestB),
  });

  tap.equal(response.statusCode, 400);
});

tap.test('should not attach keys of prototype properties to request body', async (tap) => {
  tap.plan(2);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
  });
  instance.post('/', async (request, reply) => {
    const { property } = requestC;
    tap.same(request.body, {
      property,
    });
    reply.send();
  });

  const response = await instance.inject({
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': FormContentTypes.FormUrlencoded,
    },
    payload: urlencoded(requestC),
  });

  tap.equal(response.statusCode, 200);
});
