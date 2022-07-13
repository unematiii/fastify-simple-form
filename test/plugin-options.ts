import Fastify, { FastifyInstance } from 'fastify';
import sinon from 'sinon';
import tap from 'tap';

import * as FastifySimpleForm from '../src';
import type { FormPluginOptions } from '../src';

const { default: SimpleFormPlugin, FormPluginContentTypes: FormContentTypes } = FastifySimpleForm;

const getInstanceProtoPoisoningOptions = ({
  initialConfig: { onConstructorPoisoning, onProtoPoisoning },
}: FastifyInstance) => ({ onConstructorPoisoning, onProtoPoisoning });

tap.test('should enable plugin with default options', async (tap) => {
  const instance = Fastify();
  tap.teardown(async () => instance.close());

  instance.register(SimpleFormPlugin);
  await instance.ready();

  tap.ok(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.ok(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test('should enable content type parser for `multipart/form-data` only', async (tap) => {
  const instance = Fastify();
  tap.teardown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    urlencoded: false,
  });
  await instance.ready();

  tap.ok(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.notOk(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test(
  'should enable content type parser for `application/x-www-form-urlencoded` only',
  async (tap) => {
    const instance = Fastify();
    tap.teardown(async () => instance.close());

    instance.register(SimpleFormPlugin, {
      multipart: false,
    });
    await instance.ready();

    tap.notOk(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
    tap.ok(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
  },
);

tap.test('should not register any content type parsers', async (tap) => {
  const instance = Fastify();
  tap.teardown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
    urlencoded: false,
  });
  await instance.ready();

  tap.notOk(instance.hasContentTypeParser(FormContentTypes.FromMultipart));
  tap.notOk(instance.hasContentTypeParser(FormContentTypes.FormUrlencoded));
});

tap.test(
  'should omit content type related options and pass rest to parser factory',
  async (tap) => {
    const instance = Fastify();
    tap.teardown(async () => {
      instance.close();
      sinon.restore();
    });

    const requestParserFactorySpy = sinon.spy(FastifySimpleForm, 'requestParserFactory');

    instance.register(SimpleFormPlugin);
    await instance.ready();

    tap.ok(
      requestParserFactorySpy.calledWithExactly({
        busboyOptions: {},
        ...getInstanceProtoPoisoningOptions(instance),
      }),
    );
  },
);

tap.test(
  'should prefer passed in proto poisoning options over those defined on instance level',
  async (tap) => {
    const instance = Fastify({
      onConstructorPoisoning: 'error',
      onProtoPoisoning: 'error',
    });

    tap.teardown(async () => {
      instance.close();
      sinon.restore();
    });

    const requestParserFactorySpy = sinon.spy(FastifySimpleForm, 'requestParserFactory');

    const pluginOptions: FormPluginOptions = {
      onConstructorPoisoning: 'remove',
      onProtoPoisoning: 'remove',
    };

    instance.register(SimpleFormPlugin, pluginOptions);
    await instance.ready();

    tap.ok(
      requestParserFactorySpy.calledWithExactly({
        busboyOptions: {},
        ...pluginOptions,
      }),
    );
  },
);
