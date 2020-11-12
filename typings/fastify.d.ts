// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';

declare module 'fastify' {
  export type FastifyInstanceConfiguration = Pick<
    FastifyServerOptions,
    | 'connectionTimeout'
    | 'keepAliveTimeout'
    | 'requestIdHeader'
    | 'requestIdLogLabel'
    | 'disableRequestLogging'
    | 'bodyLimit'
    | 'caseSensitive'
    | 'ignoreTrailingSlash'
    | 'maxParamLength'
    | 'onProtoPoisoning'
    | 'onConstructorPoisoning'
    | 'pluginTimeout'
  > &
    Pick<FastifyHttp2Options, 'http2SessionTimeout'>;

  export interface FastifyInstance {
    initialConfig: FastifyInstanceConfiguration;
  }
}
