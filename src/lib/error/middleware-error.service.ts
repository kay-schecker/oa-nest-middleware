import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { MiddlewareConfig } from '../config/middleware-config.interface';

type K = keyof MiddlewareConfig['exceptions'];

@Injectable()
export class MiddlewareErrorService {

  private readonly defaultExceptions: Required<MiddlewareConfig['exceptions']> = {
    reqOperationNotFound: new NotFoundException(),
    reqBadHeader: new BadRequestException(),
    reqContentType: new BadRequestException(),
    reqBadContentType: new BadRequestException(),
    resBadContentType: new BadRequestException(),
    reqUnauthorized: new UnauthorizedException(),
  }

  constructor(
    @Inject(MiddlewareConfig) private readonly options: MiddlewareConfig,
  ) {
  }

  public throwIfFalsy(val: any, name: K, value?: Object) {
    this.throwIfTruthy(!val, name, value);
  }

  public throwIfTruthy(val: any, name: K, value?: Object) {
    val && this.throw(name, value);
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
