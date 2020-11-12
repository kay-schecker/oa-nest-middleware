import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as getPort from 'get-port';
import { JWK, JWKS, JWT } from 'jose';
import { lowerCase as lc } from 'lodash';
import { Server } from 'net';

import * as request from 'supertest';
import { AppController } from './app.controller';

import { MiddlewareModule } from './lib';

describe('E2E', () => {

  let jwt: string;
  let server: Server;
  let app: express.Application;
  let keystore: JWKS.KeyStore;

  const authenticate = (permissions: string[], key: JWK.Key) => {
    jwt = JWT.sign({permissions}, key, {
      algorithm: 'RS256',
      header: {typ: 'JWT', expiresIn: '1 hour'},
    });
  }

  beforeAll(async () => {
    keystore = new JWKS.KeyStore()
    await keystore.generate('RSA')
    const [key] = keystore.all();

    jwt = JWT.sign({permissions: ['user:read']}, key, {
      algorithm: 'RS256',
      header: {typ: 'JWT', expiresIn: '1 hour'},
    });
  })

  beforeAll(async () => {
    const port = await getPort();
    const spec = require('./specs/petstore.json');
    spec.components.securitySchemes.oidc.openIdConnectUrl = `http://localhost:${port}/.well-known/openid-configuration`

    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      imports: [
        await MiddlewareModule.register({
          spec: require('./specs/petstore.json'),
          excludes: ['.well-known/(.*)']
        }),
      ],
    }).compile();

    app = express()
      .get('/.well-known/jwks.json', (req, res) => res.json(keystore.toJWKS()).send())
      .get('/.well-known/openid-configuration', (req, res) => res.json({
        issuer: 'https://e2e.test',
        jwks_uri: `http://localhost:${port}/.well-known/jwks.json`,
      }).send())

    const nestApp = await moduleRef.createNestApplication(new ExpressAdapter(app)).init()
    await nestApp.listen(port)
    server = nestApp.getHttpServer()
  })

  const ROLE = {
    unauthorized: 'unauthorized',
    unauthenticated: 'unauthenticated',
    pets: {
      reader: ['pets:read'],
      writer: ['pets:write'],
      admin: ['pets:read', 'pets:write', 'pets:admin'],
    },
  };

  const MODEL = {
    cat: {
      id: 1,
      name: 'Cat',
    },
    dog: {
      id: 2,
      name: 'Dog',
      blocked: false,
    },
  }

  const none = undefined;
  const get = 'get';
  const post = 'post';
  const json = 'application/json';
  const text = 'application/text';
  const {dog, cat} = MODEL;

  it.each` 
    #     | status | method  | url            | reqBody | permissions             | contentType
    
    ${10} | ${404} | ${get}  | ${'/animals'}  | ${none} | ${ROLE.unauthorized}    | ${none}
    ${11} | ${404} | ${get}  | ${'/animals'}  | ${none} | ${ROLE.pets.admin}      | ${none}

    // GET /posts (public endpoint)
    ${20} | ${200} | ${get}  | ${'/posts'}    | ${none} | ${ROLE.unauthorized}    | ${none}
    ${21} | ${200} | ${get}  | ${'/posts'}    | ${none} | ${ROLE.unauthenticated} | ${none}

    // GET /pets (application/json is not supported here)
    ${30} | ${400} | ${get}  | ${'/pets'}     | ${none} | ${ROLE.unauthorized}    | ${json}
    ${31} | ${400} | ${get}  | ${'/pets'}     | ${none} | ${ROLE.unauthenticated} | ${json}
    ${32} | ${400} | ${get}  | ${'/pets'}     | ${none} | ${ROLE.pets.admin}      | ${json}

    // GET /pets (pets:r required)
    ${41} | ${401} | ${get}  | ${'/pets'}     | ${none} | ${ROLE.unauthorized}    | ${none}
    ${42} | ${403} | ${get}  | ${'/pets'}     | ${none} | ${ROLE.unauthenticated} | ${none}
    ${43} | ${200} | ${get}  | ${'/pets'}     | ${none} | ${ROLE.pets.admin}      | ${none}

    // POST /pets (cat = pets:write required)
    ${51} | ${401} | ${post} | ${'/pets'}     | ${cat}  | ${ROLE.unauthorized}    | ${json}
    ${52} | ${403} | ${post} | ${'/pets'}     | ${cat}  | ${ROLE.unauthenticated} | ${json}
    ${53} | ${201} | ${post} | ${'/pets'}     | ${cat}  | ${ROLE.pets.writer}     | ${json}
    ${54} | ${201} | ${post} | ${'/pets'}     | ${cat}  | ${ROLE.pets.admin}      | ${json}
    
    // POST /pets (dog = pets:write + pets:admin required)
    ${55} | ${403} | ${post} | ${'/pets'}     | ${dog}  | ${ROLE.pets.writer}     | ${json}
    ${56} | ${201} | ${post} | ${'/pets'}     | ${dog}  | ${ROLE.pets.admin}      | ${json}
    
    // POST /pets (application/text is not supported here)
    ${60} | ${400} | ${post} | ${'/pets'}     | ${none} | ${ROLE.pets.admin}      | ${text}

    // POST /pets/123 (POST not supported here)
    ${70} | ${404} | ${post} | ${'/pets/123'} | ${none} | ${ROLE.pets.admin}      | ${json}

  `('[$#] $status $method $url', ({permissions, method, url, contentType, status, reqBody}) => {

    const testReq: request.Test = request(server)[(lc(method as 'get' | 'post'))](url);

    if (permissions !== 'unauthorized') {
      permissions = permissions === 'unauthenticated' ? [] : permissions
      authenticate(permissions, keystore.all().pop())
      testReq.set({'Authorization': `Bearer ${jwt}`});
    }

    reqBody !== undefined && testReq.send(reqBody)
    contentType && testReq.set('content-type', contentType);
    return testReq.expect(status);
  })

})
