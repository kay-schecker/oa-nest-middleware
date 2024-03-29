import { Test } from '@nestjs/testing';
import { BadHeaderException } from '../exceptions';
import { ErrorService } from './error.service';

describe('MiddlewareErrorService', () => {

  let fixture: ErrorService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErrorService,
      ]
    }).compile();

    fixture = moduleRef.get(ErrorService);
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
        expect(() => fixture.throwIfFalsy(val, BadHeaderException)).toThrow()
      })

      it.each([
        true,
        1,
        ' ',
      ])('does not throw, if the value is %s', (val) => {
        expect(() => fixture.throwIfFalsy(val, BadHeaderException)).not.toThrow()
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
        expect(() => fixture.throwIfTruthy(val, BadHeaderException)).not.toThrow()
      })

      it.each([
        true,
        1,
        ' ',
      ])('throws if, the value is %s', (val) => {
        expect(() => fixture.throwIfTruthy(val, BadHeaderException)).toThrow()
      })

    })

    describe('throw', () => {

      it.each([
        BadHeaderException,
        new BadHeaderException(),
        () => new BadHeaderException(),
      ])('throws', (error) => {
        expect(() => fixture.throw(error)).toThrow(BadHeaderException)
      })

    })

  })

})
