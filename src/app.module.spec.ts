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
      reader: ['pets:r'],
      admin: ['pets:r', 'pets:w'],
    },
  };

  const MODEL = {
    pets: {
      admin: {},
    }
  }

  it.each` 
    permissions             | method    | contentType           | url            | status
    
    ${ROLE.unauthorized}    | ${'GET'}  | ${undefined}          | ${'/animals'}  | ${404}
    ${ROLE.pets.admin}      | ${'GET'}  | ${undefined}          | ${'/animals'}  | ${404}

    // GET /posts (public endpoint)
    ${ROLE.unauthorized}    | ${'GET'}  | ${undefined}          | ${'/posts'}    | ${200}
    ${ROLE.unauthenticated} | ${'GET'}  | ${undefined}          | ${'/posts'}    | ${200}

    // GET /pets (application/json is not supported here)
    ${ROLE.unauthorized}    | ${'GET'}  | ${'application/json'} | ${'/pets'}     | ${400}
    ${ROLE.unauthenticated} | ${'GET'}  | ${'application/json'} | ${'/pets'}     | ${400}
    ${ROLE.pets.admin}      | ${'GET'}  | ${'application/json'} | ${'/pets'}     | ${400}

    // GET /pets (pets:r required)
    ${ROLE.unauthorized}    | ${'GET'}  | ${undefined}          | ${'/pets'}     | ${401}
    ${ROLE.unauthenticated} | ${'GET'}  | ${undefined}          | ${'/pets'}     | ${403}
    ${ROLE.pets.admin}      | ${'GET'}  | ${undefined}          | ${'/pets'}     | ${200}

    // POST /pets (pets:w required)
    ${ROLE.unauthorized}    | ${'POST'} | ${'application/json'} | ${'/pets'}     | ${401}
    ${ROLE.unauthenticated} | ${'POST'} | ${'application/json'} | ${'/pets'}     | ${403}
    ${ROLE.pets.admin}      | ${'POST'} | ${'application/json'} | ${'/pets'}     | ${201}
    
    // POST /pets (application/text is not supported here)
    ${ROLE.pets.admin}      | ${'POST'} | ${'application/text'} | ${'/pets'}     | ${400}

    // POST /pets/123 (POST not supported here)
    ${ROLE.pets.admin}      | ${'POST'} | ${'application/json'} | ${'/pets/123'} | ${404}

  `('$permissions: $method $url responds with $status', ({permissions, method, url, contentType, status}) => {
    const testReq = request(server)[(lc(method as 'get' | 'post'))](url);

    if (permissions !== 'unauthorized') {
      permissions = permissions === 'unauthenticated' ? [] : permissions
      authenticate(permissions, keystore.all().pop())
      testReq.set({'Authorization': `Bearer ${jwt}`});
    }

    contentType && testReq.set('content-type', contentType);
    return testReq.expect(status);
  })

})
