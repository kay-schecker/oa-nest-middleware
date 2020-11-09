import { Test } from '@nestjs/testing';
import { ExpressAdapter } from '@nestjs/platform-express';

import * as request from 'supertest';
import { lowerCase as lc } from 'lodash';
import { Server } from 'net';
import * as express from 'express';
import { JWKS, JWT } from 'jose';
import * as getPort from 'get-port';

import { MiddlewareModule } from './lib';
import { AppController } from './app.controller';

describe('E2E', () => {

  let jwt: string;
  let server: Server;
  let app: express.Application;
  let keystore: JWKS.KeyStore;

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
      .get('/.well-known/jwks.json', (req, res) => {
        res.json(keystore.toJWKS()).send()
      })
      .get('/.well-known/openid-configuration', (req, res) => {
        res.json({
          issuer: 'https://e2e.test',
          jwks_uri: `http://localhost:${port}/.well-known/jwks.json`,
        }).send();
      })

    const nestApp = await moduleRef.createNestApplication(new ExpressAdapter(app)).init()
    await nestApp.listen(port)
    server = nestApp.getHttpServer()
  })

  it.each`
    method    | contentType           | url            | status
    ${'GET'}  | ${undefined}          | ${'/.well-known/jwks.json'}  | ${200}
    ${'GET'}  | ${undefined}          | ${'/animals'}  | ${404}

    ${'GET'}  | ${undefined}          | ${'/pets'}     | ${200}
    ${'GET'}  | ${'application/json'} | ${'/pets'}     | ${400}

    ${'POST'} | ${'application/json'} | ${'/pets'}     | ${201}
    ${'POST'} | ${'application/text'} | ${'/pets'}     | ${400}

    ${'POST'} | ${'application/json'} | ${'/pets/123'} | ${404}
  `('$method $url responds with $status', (
    {method, url, contentType, status}) => {
      const req = request(server)
        [(lc(method as 'get' | 'post'))](url).set({'Authorization': `Bearer ${jwt}`});
      contentType && req.set('content-type', contentType);
      return req.expect(status);
    }
  )

})
