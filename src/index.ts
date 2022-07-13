import busboy from 'busboy';
import { cloneDeep, pick } from 'lodash';
import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyServerOptions } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Export types
 */

export enum FormPluginContentTypes {
  FromMultipart = 'multipart/form-data',
  FormUrlencoded = 'application/x-www-form-urlencoded',
}

export interface FormPluginContentParserOptions {
  onConstructorPoisoning?: FastifyServerOptions['onConstructorPoisoning'];
  onProtoPoisoning?: FastifyServerOptions['onProtoPoisoning'];
  busboyOptions?: Omit<busboy.BusboyConfig, 'headers'>;
}

export interface FormPluginOptions extends FormPluginContentParserOptions {
  multipart?: boolean;
  urlencoded?: boolean;
}

export type ParsedFormBody = Record<string, string | string[]>;

/**
 * Utils
 */

// Attaches field to body while doing some proto poisoning checks
const attachToBodySafe = (
  options: Omit<FormPluginContentParserOptions, 'busboyOptions'>,
  body: ParsedFormBody,
  field: string,
  value: string,
) => {
  const action = Object.getOwnPropertyDescriptor(Object.prototype, field)
    ? field === 'constructor'
      ? options.onConstructorPoisoning
      : options.onProtoPoisoning
    : 'ignore';

  switch (action) {
    case 'ignore':
      return attachToBody(body, field, value);
    case 'error':
      throw new SyntaxError('Object contains forbidden prototype property');
    case 'remove':
      return;
  }
};

// Assigns property to an object, multiple occurrences of a property will get merged into an array
const attachToBody = (body: ParsedFormBody, field: string, value: string) => {
  if (body[field]) {
    if (Array.isArray(body[field])) {
      (body[field] as string[]).push(value);
    } else {
      body[field] = [body[field] as string, value];
    }
  } else {
    body[field] = value;
  }
};

// Merges options with default options
const defaultOptions: FormPluginOptions = {
  multipart: true,
  urlencoded: true,
};

const getPluginOptions = (
  instance: FastifyInstance,
  { busboyOptions, ...pluginOptions }: FormPluginOptions,
): FormPluginOptions =>
  Object.assign(
    {},
    pick(instance.initialConfig, ['onConstructorPoisoning', 'onProtoPoisoning']),
    defaultOptions,
    pluginOptions,
    { busboyOptions: cloneDeep(busboyOptions || {}) },
  );

/**
 * Parser factory
 */
export const requestParserFactory =
  ({ busboyOptions, ...parserOptions }: FormPluginContentParserOptions) =>
  (req: FastifyRequest): Promise<ParsedFormBody> =>
    new Promise((resolve, reject) => {
      try {
        const request = req.raw;

        const body: ParsedFormBody = {};
        const bb = busboy(Object.assign({ headers: request.headers }, busboyOptions));

        bb.on('field', (field, value) => {
          try {
            attachToBodySafe(parserOptions, body, field, value);
          } catch (error) {
            reject(error);
          }
        });
        bb.on('finish', () => resolve(body));
        bb.on('error', (error: unknown) => reject(error));

        request.pipe(bb);
      } catch (error) {
        reject(error);
      }
    });

/**
 * Plugin
 * @param instance Fastify instance
 * @param options Plugin options
 */
export const formPlugin: FastifyPluginAsync<FormPluginOptions> = async (
  instance,
  options: FormPluginOptions,
) => {
  const { multipart, urlencoded, ...parserOptions } = getPluginOptions(instance, options);

  const contentTypes = [
    ...(multipart ? [FormPluginContentTypes.FromMultipart] : []),
    ...(urlencoded ? [FormPluginContentTypes.FormUrlencoded] : []),
  ];

  if (contentTypes.length) {
    instance.addContentTypeParser(contentTypes, requestParserFactory(parserOptions));
  }
};

export default fp(formPlugin, {
  fastify: '>=4.x',
});
