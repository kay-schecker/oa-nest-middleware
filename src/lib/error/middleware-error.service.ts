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

  throwIfFalsy(val: any, name: K) {
    this.throwIfTruthy(!val, name);
  }

  throwIfTruthy(val: any, name: K) {
    val && this.throw(name);
  }

  throw(name: K) {

    if (this.options.exceptions && this.options.exceptions[name] === false) {
      return;
    }

    const e = (this.options.exceptions && this.options.exceptions[name]) || this.defaultExceptions[name];

    if (typeof e === 'function') {
      throw e();
    }

    if (e instanceof HttpException) {
      throw e;
    }

  }

}
