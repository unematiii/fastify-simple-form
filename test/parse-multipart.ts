import { AddressInfo } from 'net';
import Fastify, { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import http from 'http';
import tap from 'tap';

import { requestA, requestB, requestC, requestD, schema } from './fixtures';
import SimpleFormPlugin, { FormPluginContentTypes } from '../src';

const getFormData = (params: Record<string, string | string[]>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(key, item));
    } else {
      form.append(key, value);
    }
  }
  return form;
};

const getRequestOptions = (instance: FastifyInstance, form: FormData) => ({
  path: '/',
  protocol: 'http:',
  hostname: 'localhost',
  port: (instance.server.address() as AddressInfo).port,
  headers: form.getHeaders(),
  method: 'POST',
});

tap.test('should parse content and attach fields to request body', (tap) => {
  tap.plan(4);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    urlencoded: false,
  });
  instance.post('/', async (request, reply) => {
    tap.same(request.body, requestA);
    reply.send();
  });

  const form = getFormData(requestA);

  instance.listen(0, (error) => {
    tap.error(error);

    const request = http.request(getRequestOptions(instance, form));
    request.on('response', (response) => {
      tap.equals(response.statusCode, 200);
      response.resume();
      response.on('end', () => tap.pass());
    });

    form.pipe(request);
  });
});

tap.test('should parse duplicate fields as an array', (tap) => {
  tap.plan(3);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    urlencoded: false,
  });
  instance.post('/', async (request, reply) => {
    tap.same(request.body, requestD);
    reply.send();
  });

  const form = getFormData(requestD);

  instance.listen(0, (error) => {
    tap.error(error);

    const request = http.request(getRequestOptions(instance, form));
    request.on('response', (response) => {
      tap.equals(response.statusCode, 200);
    });

    form.pipe(request);
  });
});

tap.test(
  'should parse content, attach fields to request body and trigger schema validation error',
  (tap) => {
    tap.plan(7);

    const instance = Fastify();
    tap.tearDown(async () => instance.close());

    instance.register(SimpleFormPlugin, {
      urlencoded: false,
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

    const form = getFormData(requestB);

    instance.listen(0, (error) => {
      tap.error(error);

      const request = http.request(getRequestOptions(instance, form));
      request.on('response', (response) => {
        tap.equals(response.statusCode, 400);
      });

      form.pipe(request);
    });
  },
);

tap.test('should not attach keys of prototype properties to request body', (tap) => {
  tap.plan(3);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    urlencoded: false,
    onConstructorPoisoning: 'remove',
    onProtoPoisoning: 'remove',
  });
  instance.post('/', async (request, reply) => {
    const { property } = requestC;
    tap.same(request.body, {
      property,
    });
    reply.send();
  });

  const form = getFormData(requestC);

  instance.listen(0, (error) => {
    tap.error(error);

    const request = http.request(getRequestOptions(instance, form));
    request.on('response', (response) => {
      tap.equals(response.statusCode, 200);
    });

    form.pipe(request);
  });
});

tap.test(
  'should trigger an error when `constructor` property is found and `onConstructorPoisoning` is set to `error`',
  (tap) => {
    tap.plan(3);

    const instance = Fastify();
    tap.tearDown(async () => instance.close());

    instance.register(SimpleFormPlugin, {
      urlencoded: false,
      onConstructorPoisoning: 'error',
      onProtoPoisoning: 'remove',
    });
    instance.post('/', {
      errorHandler: (error, _, reply) => {
        tap.equal(error.message, 'Object contains forbidden prototype property');
        reply.send(error);
      },
      handler: (_, reply) => {
        reply.send();
      },
    });

    const form = getFormData(requestC);

    instance.listen(0, (error) => {
      tap.error(error);

      const request = http.request(getRequestOptions(instance, form));
      request.on('response', (response) => {
        tap.equals(response.statusCode, 500);
      });

      form.pipe(request);
    });
  },
);

tap.test(
  'should trigger an error when prototype property is found and `onProtoPoisoning` is set to `error`',
  (tap) => {
    tap.plan(3);

    const instance = Fastify();
    tap.tearDown(async () => instance.close());

    instance.register(SimpleFormPlugin, {
      urlencoded: false,
      onConstructorPoisoning: 'remove',
      onProtoPoisoning: 'error',
    });
    instance.post('/', {
      errorHandler: (error, _, reply) => {
        tap.equal(error.message, 'Object contains forbidden prototype property');
        reply.send(error);
      },
      handler: (_, reply) => {
        reply.send();
      },
    });

    const form = getFormData(requestC);

    instance.listen(0, (error) => {
      tap.error(error);

      const request = http.request(getRequestOptions(instance, form));
      request.on('response', (response) => {
        tap.equals(response.statusCode, 500);
      });

      form.pipe(request);
    });
  },
);

tap.test('should trigger an error on busboy instance', (tap) => {
  tap.plan(3);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    urlencoded: false,
  });
  instance.post('/', {
    errorHandler: (error, _, reply) => {
      tap.equal(error.message, 'Multipart: Boundary not found');
      reply.send(error);
    },
    handler: (_, reply) => {
      reply.send();
    },
  });

  const form = new FormData();

  instance.listen(0, (error) => {
    tap.error(error);

    const request = http.request({
      ...getRequestOptions(instance, form),
      headers: {
        'Content-Type': FormPluginContentTypes.FromMultipart,
      },
    });
    request.on('response', (response) => {
      tap.equals(response.statusCode, 500);
    });

    form.pipe(request);
  });
});
