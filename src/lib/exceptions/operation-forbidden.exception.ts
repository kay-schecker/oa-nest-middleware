import { ForbiddenException } from '@nestjs/common';

export class OperationForbiddenException extends ForbiddenException {

  constructor(
    public readonly grantedPermissions: string[],
    public readonly requiredPermissions: string[],
    public readonly missingPermissions: string[],
  ) {
    super();
  }

}
