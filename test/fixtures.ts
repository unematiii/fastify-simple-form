export const requestA = {
  client_id: 'e52b2864-7611-4f26-94e4-d13f7039f25d',
  client_secret: 'rGGb45-awp0Q9X2yP3CxwhP8HhUY8uW1',
  refresh_token: 'f5e6ca6e-e2cf-4130-9b3f-26727ca11f78',
  grant_type: 'refresh_token',
};

export const requestB = {
  username: 'jon',
  password: 'snow',
  grant_type: 'password',
};

export const requestC = {
  property: 'value',
  constructor: '() => ({})',
  toString: '() => eval(2 + 2)',
};

export const requestD = {
  property: ['valueA', 'valueB', 'valueC'],
};

export const schema = {
  body: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
      },
      password: {
        type: 'string',
      },
      client_id: {
        type: 'string',
        format: 'uuid',
      },
      client_secret: {
        type: 'string',
      },
      refresh_token: {
        type: 'string',
        format: 'uuid',
      },
      grant_type: {
        type: 'string',
        enum: ['authorization_code', 'refresh_token'],
      },
    },
    required: ['grant_type'],
  },
};
