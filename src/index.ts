import busboy from 'busboy';
import { cloneDeep, merge, omit } from 'lodash';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export enum FormContentTypes {
  FromMultipart = 'multipart/form-data',
  FormUrlencoded = 'application/x-www-form-urlencoded',
}

export interface FormPluginOptions extends Omit<busboy.BusboyConfig, 'headers'> {
  multipart?: boolean;
  urlencoded?: boolean;
}

export type ParsedFormBody = Record<string, string | string[]>;

const attachToBody = (body: ParsedFormBody, field: string, value: string) => {
  if (!Object.getOwnPropertyDescriptor(Object.prototype, field)) {
    if (body[field]) {
      if (Array.isArray(body[field])) {
        (body[field] as string[]).push(value);
      } else {
        body[field] = [body[field] as string, value];
      }
    } else {
      body[field] = value;
    }
  }
};

export const requestParser = (options?: busboy.BusboyConfig) => (req: FastifyRequest): Promise<ParsedFormBody> =>
  new Promise((resolve, reject) => {
    try {
      const request = req.raw;

      const body: ParsedFormBody = {};
      const bb = new busboy(merge({ headers: request.headers }, options));

      bb.on('field', (field, value) => attachToBody(body, field, value));
      bb.on('finish', () => resolve(body));
      bb.on('error', (error: unknown) => reject(error));

      request.pipe(bb);
    } catch (error) {
      reject(error);
    }
  });

const defaultOptions: FormPluginOptions = {
  multipart: true,
  urlencoded: true,
};

const getOptions = (options?: FormPluginOptions): FormPluginOptions =>
  merge({}, defaultOptions, omit(cloneDeep(options), ['headers']));

export const formPlugin: FastifyPluginAsync<FormPluginOptions> = async (instance, options: FormPluginOptions) => {
  const { multipart, urlencoded, ...rest } = getOptions(options);

  const contentTypes = [
    ...(multipart ? [FormContentTypes.FromMultipart] : []),
    ...(urlencoded ? [FormContentTypes.FormUrlencoded] : []),
  ];

  if (contentTypes.length) {
    instance.addContentTypeParser(contentTypes, requestParser(rest));
  }
};

export default fp(formPlugin, {
  fastify: '3.x',
});
