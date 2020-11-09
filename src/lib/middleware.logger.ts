import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MiddlewareLogger extends Logger {

  constructor() {
    super('Middleware', true);
  }
}
