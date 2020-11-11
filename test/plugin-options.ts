import Fastify from 'fastify';
import sinon from 'sinon';
import tap from 'tap';

import * as FastifySimpleForm from '../src';
import type { FormPluginOptions } from '../src';

const { default: SimpleFormPlugin, FormContentTypes } = FastifySimpleForm;

tap.test('should enable plugin with default options', async (tap) => {
  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin);
  await instance.ready();

  tap.true(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.true(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test('should enable content type parser for `multipart/form-data` only', async (tap) => {
  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    urlencoded: false,
  });
  await instance.ready();

  tap.true(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.false(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test('should enable content type parser for `application/x-www-form-urlencoded` only', async (tap) => {
  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
  });
  await instance.ready();

  tap.false(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.true(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test('should not register any content type parsers', async (tap) => {
  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
    urlencoded: false,
  });
  await instance.ready();

  tap.false(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.false(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test('should omit plugin own options and pass empty options to parser', async (tap) => {
  const instance = Fastify();
  tap.tearDown(async () => {
    instance.close();
    sinon.restore();
  });

  const requestParserSpy = sinon.spy(FastifySimpleForm, 'requestParser');

  instance.register(SimpleFormPlugin);
  await instance.ready();

  tap.true(requestParserSpy.calledWithExactly({}));
});

tap.test('should omit plugin own options and pass rest to parser as busboy options, `headers` omitted', async (tap) => {
  const instance = Fastify();
  tap.tearDown(async () => {
    instance.close();
    sinon.restore();
  });

  const requestParserSpy = sinon.spy(FastifySimpleForm, 'requestParser');
  const headers = {
    Connection: 'keep-alive',
  };
  const busboyOptions: FormPluginOptions = {
    defCharset: 'utf-8',
    limits: {
      fields: 10,
      headerPairs: 20,
    },
  };
  const pluginOptions = {
    multipart: true,
    urlencoded: false,
    headers,
    ...busboyOptions,
  };

  instance.register(SimpleFormPlugin, pluginOptions);
  await instance.ready();

  tap.true(requestParserSpy.calledWithExactly(busboyOptions));
});
