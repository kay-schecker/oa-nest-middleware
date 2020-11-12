import { ForbiddenException } from '@nestjs/common';
import { AuthResult } from '../auth/auth-result.model';

export class OperationForbiddenException extends ForbiddenException {

  constructor(
    public readonly authResult: AuthResult,
  ) {
    super();
  }

}
