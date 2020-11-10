import Fastify from 'fastify';
import tap from 'tap';
import urlencoded from 'form-urlencoded';
import { Writable } from 'stream';

const streamErrorMessage = 'Stream error';
class FakeBusboy extends Writable {
  constructor() {
    super();

    this.on('pipe', () => {
      this.emit('error', new Error(streamErrorMessage));
    });
  }
}

require.cache[require.resolve('busboy')] = ({
  exports: FakeBusboy,
} as unknown) as NodeModule;

import SimpleFormPlugin, { FormContentTypes } from '../src';
import { requestA } from './fixtures';

tap.test('should trigger error handler when busboy stream emits error event', async (tap) => {
  tap.plan(2);

  const instance = Fastify();
  tap.tearDown(async () => instance.close());

  instance.register(SimpleFormPlugin, {
    multipart: false,
  });
  instance.post('/', {
    errorHandler: (error, _, reply) => {
      tap.equals(error.message, streamErrorMessage);
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
    payload: urlencoded(requestA),
  });

  tap.equal(response.statusCode, 500);
});
