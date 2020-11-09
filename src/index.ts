import busboy from 'busboy';
import { cloneDeep, merge, omit } from 'lodash';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export interface FormPluginOptions extends busboy.BusboyConfig {
  multipart?: boolean;
  urlencoded?: boolean;
}

export const requestParser = (options?: busboy.BusboyConfig) => (
  req: FastifyRequest,
): Promise<Record<string, string>> =>
  new Promise((resolve, reject) => {
    try {
      const request = req.raw;

      const body: Record<string, string> = {};
      const bb = new busboy(merge({ headers: request.headers }, cloneDeep(options)));

      bb.on('field', (field, value) => {
        if (!Object.getOwnPropertyDescriptor(Object.prototype, field)) {
          body[field] ||= value;
        }
      });
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

export const formPlugin: FastifyPluginAsync<FormPluginOptions> = async (instance, options: FormPluginOptions) => {
  const { multipart, urlencoded, ...rest } = merge(defaultOptions, options);

  const contentTypes = [
    ...(multipart ? ['multipart/form-data'] : []),
    ...(urlencoded ? ['application/x-www-form-urlencoded'] : []),
  ];

  if (contentTypes.length) {
    instance.addContentTypeParser(contentTypes, requestParser(omit(rest, ['headers'])));
  }
};

export default fp(formPlugin, {
  fastify: '3.x',
});
