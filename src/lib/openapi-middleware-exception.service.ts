import { BadRequestException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OpenApiMiddlewareConfig } from './interfaces/openapi-middleware.config';

type K = keyof OpenApiMiddlewareConfig['exceptions'];

@Injectable()
export class OpenApiMiddlewareExceptionService {

  private readonly defaultExceptions: Required<OpenApiMiddlewareConfig['exceptions']> = {
    operationNotFound: new NotFoundException(),
    badContentType: new BadRequestException(),
  }

  constructor(
    @Inject(OpenApiMiddlewareConfig) private readonly options: OpenApiMiddlewareConfig,
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
