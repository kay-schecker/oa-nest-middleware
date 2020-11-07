import { Test } from '@nestjs/testing';
import { MiddlewareErrorService } from './middleware-error.service';
import { MiddlewareConfig } from '../config/middleware-config.interface';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MiddlewareSkipError } from './middleware-skip.error';

const exceptions = {
  reqOperationNotFound: false,
  reqContentType: new BadRequestException({foo: 2}),
  reqUnauthorized: () => new UnauthorizedException({foo: 1}),
}

describe('MiddlewareErrorService', () => {

  let fixture: MiddlewareErrorService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MiddlewareErrorService,
        {provide: MiddlewareConfig, useValue: {exceptions}},
      ]
    }).compile();

    fixture = moduleRef.get(MiddlewareErrorService);
  })

  describe('API', () => {

    describe('throwIfFalsy', () => {

      it.each([
        false,
        null,
        undefined,
        '',
        0,
      ])('throws if, the value is %s', (val) => {
        expect(() => fixture.throwIfFalsy(val, 'reqBadHeader')).toThrow()
      })

      it.each([
        true,
        1,
        ' ',
      ])('does not throw, if the value is %s', (val) => {
        expect(() => fixture.throwIfFalsy(val, 'reqBadHeader')).not.toThrow()
      })

    })

    describe('throwIfTruthy', () => {

      it.each([
        false,
        null,
        undefined,
        '',
        0,
      ])('does not throw, if the value is %s', (val) => {
        expect(() => fixture.throwIfTruthy(val, 'reqBadHeader')).not.toThrow()
      })

      it.each([
        true,
        1,
        ' ',
      ])('throws if, the value is %s', (val) => {
        expect(() => fixture.throwIfTruthy(val, 'reqBadHeader')).toThrow()
      })

    })

    describe('throw', () => {

      it('throws no exception for reqOperationNotFound', () => {
        expect(() => fixture.throw('reqOperationNotFound')).toThrow(MiddlewareSkipError);
      })

      it('throws the correct exception for reqUnauthorized', () => {
        expect(() => fixture.throw('reqUnauthorized')).toThrowError(exceptions.reqUnauthorized())
      })

      it('throws the correct exception for reqContentType', () => {
        expect(() => fixture.throw('reqContentType')).toThrowError(exceptions.reqContentType)
      })

    })

  })

})
