import { Injectable, Type } from '@nestjs/common';

type E = Type<Error> | Error | (() => Error);

@Injectable()
export class MiddlewareErrorService {

  throwIfFalsy(val: any, error: E) {
    this.throwIfTruthy(!val, error);
  }

  throwIfTruthy(val: any, error: E) {
    val && this.throw(error);
  }

  throw(error: E) {

    if (typeof error === 'function') {
      if (error.prototype) {
        throw new (error as Type<any>)
      }

      throw (error as () => Error)();
    }

    throw error;
  }

}
