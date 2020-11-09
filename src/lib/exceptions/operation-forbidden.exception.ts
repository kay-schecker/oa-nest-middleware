import { ForbiddenException } from '@nestjs/common';

export class OperationForbiddenException extends ForbiddenException {

  constructor(
    public readonly foo: any,
  ) {
    super();
  }

}
