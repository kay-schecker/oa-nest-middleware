import { Test } from '@nestjs/testing';

import * as request from 'supertest';
import { lowerCase as lc } from 'lodash';
import { Server } from 'net';
import { AppModule } from './app.module';

describe('E2E', () => {

  let server: Server;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createNestApplication().init()
    server = app.getHttpServer();
  })

  it.each`
    method    | contentType           | url            | status
    ${'GET'}  | ${undefined}          | ${'/animals'}  | ${404}

    ${'GET'}  | ${undefined}          | ${'/pets'}     | ${200}
    ${'GET'}  | ${'application/json'} | ${'/pets'}     | ${400}

    ${'POST'} | ${'application/json'} | ${'/pets'}     | ${201}
    ${'POST'} | ${'application/text'} | ${'/pets'}     | ${400}

    ${'POST'} | ${'application/json'} | ${'/pets/123'} | ${404}
  `('$method $url responds with $status', (
    {method, url, contentType, status}) => {
      const req = request(server)[(lc(method as 'get' | 'post'))](url);
      contentType && req.set('content-type', contentType);
      return req.expect(status);
    }
  )

})
