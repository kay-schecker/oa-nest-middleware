import { BadRequestException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MiddlewareConfig } from '../config/openapi-middleware.config';

type K = keyof MiddlewareConfig['exceptions'];

@Injectable()
export class MiddlewareErrorService {

  private readonly defaultExceptions: Required<MiddlewareConfig['exceptions']> = {
    operationNotFound: new NotFoundException(),
    badResponseContentType: new BadRequestException(),
  }

  constructor(
    @Inject(MiddlewareConfig) private readonly options: MiddlewareConfig,
  ) {
  }

  public throwIfFalsy(val: any, name: K, value?: Object) {
    if (!val) {
      this.throw(name, value);
    }
  }

  public throw(name: K, value?: Object) {

    if (this.options.exceptions && this.options.exceptions[name] === false) {
      return;
    }

    const e = (this.options.exceptions && this.options.exceptions[name]) || this.defaultExceptions[name];

    if (typeof e === 'function') {
      throw (e as (v: any) => HttpException)(value);
    }

    if (e instanceof HttpException) {
      throw e;
    }

  }

}
