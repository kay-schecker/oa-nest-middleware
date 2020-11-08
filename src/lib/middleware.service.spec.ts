import { Test } from '@nestjs/testing';
import { MiddlewareService } from './middleware.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareDefaultAdapter } from './adapter/middleware-default-adapter';
import { MiddlewareErrorService } from './error/middleware-error.service';

import * as request from 'supertest';
import * as express from 'express';
import { lowerCase as lc } from 'lodash';
import { HttpException } from '@nestjs/common';

const app = express();

describe('MiddlewareService (E2E)', () => {

  let fixture: MiddlewareService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MiddlewareService,
        MiddlewareErrorService,
        {
          provide: MiddlewareConfig, useValue: {
            spec: require('../specs/petstore.json'),
          }
        },
        {provide: MiddlewareAdapter, useClass: MiddlewareDefaultAdapter},
      ],
    }).compile();

    fixture = moduleRef.get(MiddlewareService);

    app.use(async (req, res, next) => {
      req.baseUrl = req.path; // somehow not set

      try {
        await fixture.use(req, res as any, next);
      } catch (e) {
        if (e instanceof HttpException) {
          res.sendStatus(e.getStatus());
          // res.json(e.getResponse()).status(e.getStatus()).send();
        } else {
          res.status(500).send();
        }
      }
    });

    app.all('*', (req, res) => res.send('200'));

  })

  it.each`
    method    | contentType           | url            | status
    ${'GET'}  | ${undefined}          | ${'/animals'}  | ${404}

    ${'GET'}  | ${undefined}          | ${'/pets'}     | ${200}
    ${'GET'}  | ${'application/json'} | ${'/pets'}     | ${400}

    ${'POST'} | ${'application/json'} | ${'/pets'}     | ${200}
    ${'POST'} | ${'application/text'} | ${'/pets'}     | ${400}

    ${'POST'} | ${'application/json'} | ${'/pets/123'} | ${404}
  `('$method $url responds with $status', (
    {method, url, contentType, status}) => {
      const req = request(app)[(lc(method as 'get' | 'post'))](url);
      contentType && req.set('content-type', contentType);
      return req.expect(status);
    }
  )

})
