const { test } = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');

const plugin = require('../dist/index.js').default;
const { requestParserFactory } = require('../dist/index.js');

function payload(type, entries) {
  if (type === 'application/x-www-form-urlencoded') {
    return {
      headers: { 'content-type': type },
      payload: new URLSearchParams(entries).toString(),
    };
  }

  const boundary = 'fastify-simple-form-test-boundary';
  const parts = entries.map(([key, value]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
  );
  return {
    headers: { 'content-type': `${type}; boundary=${boundary}` },
    payload: Buffer.from(`${parts.join('')}--${boundary}--\r\n`),
  };
}

async function createServer(options = {}, fastifyOptions = {}) {
  const app = Fastify(fastifyOptions);
  await app.register(plugin, options);
  app.post('/', async (request) => request.body);
  return app;
}

for (const type of ['application/x-www-form-urlencoded', 'multipart/form-data']) {
  test(`${type}: parses fields and duplicate names`, async (t) => {
    const app = await createServer();
    t.after(() => app.close());
    const response = await app.inject({
      method: 'POST', path: '/',
      ...payload(type, [['name', 'Ada'], ['name', 'Grace'], ['empty', '']]),
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { name: ['Ada', 'Grace'], empty: '' });
  });

  test(`${type}: retains an empty first value in a repeated field`, async (t) => {
    const app = await createServer();
    t.after(() => app.close());
    const response = await app.inject({
      method: 'POST', path: '/',
      ...payload(type, [['name', ''], ['name', 'Ada']]),
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { name: ['', 'Ada'] });
  });

  test(`${type}: validates parsed fields`, async (t) => {
    const app = Fastify();
    t.after(() => app.close());
    await app.register(plugin);
    app.post('/', {
      schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
    }, async (request) => request.body);
    const response = await app.inject({ method: 'POST', path: '/', ...payload(type, [['other', 'x']]) });
    assert.equal(response.statusCode, 400);
  });

  test(`${type}: removes forbidden keys when configured`, async (t) => {
    const app = await createServer({ onConstructorPoisoning: 'remove', onProtoPoisoning: 'remove' });
    t.after(() => app.close());
    const response = await app.inject({
      method: 'POST', path: '/',
      ...payload(type, [['safe', 'value'], ['constructor', 'bad'], ['toString', 'bad'], ['__proto__', 'bad']]),
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { safe: 'value' });
  });

  test(`${type}: rejects forbidden keys when configured`, async (t) => {
    const app = await createServer({ onConstructorPoisoning: 'error', onProtoPoisoning: 'error' });
    t.after(() => app.close());
    const response = await app.inject({ method: 'POST', path: '/', ...payload(type, [['constructor', 'bad']]) });
    assert.equal(response.statusCode, 500);
    assert.match(response.json().message, /forbidden prototype property/);
  });

  test(`${type}: handles inherited names when ignored`, async (t) => {
    const app = await createServer({ onConstructorPoisoning: 'ignore', onProtoPoisoning: 'ignore' });
    t.after(() => app.close());
    const response = await app.inject({
      method: 'POST', path: '/',
      ...payload(type, [['toString', 'first'], ['toString', 'second'], ['constructor', 'value'], ['__proto__', 'safe']]),
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), JSON.parse('{"toString":["first","second"],"constructor":"value","__proto__":"safe"}'));
    assert.equal({}.safe, undefined);
  });
}

test('registers only selected parsers', async (t) => {
  const app = await createServer({ multipart: false });
  t.after(() => app.close());
  assert.equal(app.hasContentTypeParser('application/x-www-form-urlencoded'), true);
  assert.equal(app.hasContentTypeParser('multipart/form-data'), false);

  const disabled = await createServer({ multipart: false, urlencoded: false });
  t.after(() => disabled.close());
  assert.equal(disabled.hasContentTypeParser('application/x-www-form-urlencoded'), false);
  assert.equal(disabled.hasContentTypeParser('multipart/form-data'), false);
});

test('uses Fastify poisoning policy by default', async (t) => {
  const app = await createServer({}, { onConstructorPoisoning: 'remove', onProtoPoisoning: 'remove' });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', path: '/',
    ...payload('application/x-www-form-urlencoded', [['constructor', 'bad'], ['safe', 'value']]),
  });
  assert.deepEqual(response.json(), { safe: 'value' });
});

test('reports malformed multipart input', async (t) => {
  const app = await createServer();
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', path: '/', headers: { 'content-type': 'multipart/form-data' }, payload: 'invalid',
  });
  assert.equal(response.statusCode, 500);
  assert.match(response.json().message, /Boundary not found/);
});

test('passes Busboy field limits through', async (t) => {
  const app = await createServer({ busboyOptions: { limits: { fields: 1 } } });
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST', path: '/',
    ...payload('multipart/form-data', [['first', 'a'], ['second', 'b']]),
  });
  assert.deepEqual(response.json(), { first: 'a' });
});

test('discards multipart files while retaining text fields', async (t) => {
  const app = await createServer();
  t.after(() => app.close());
  const boundary = 'fastify-simple-form-file-test';
  const body = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="upload"; filename="a.txt"\r\n` +
    'Content-Type: text/plain\r\n\r\nfile contents\r\n' +
    `--${boundary}--\r\n`,
  );
  const response = await app.inject({
    method: 'POST', path: '/',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: body,
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { note: 'hello' });
});

test('rejects Busboy stream errors', async () => {
  const request = {
    raw: {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      pipe(parser) { parser.emit('error', new Error('stream failed')); },
    },
  };
  await assert.rejects(requestParserFactory({})(request), /stream failed/);
});
