import { BadRequestException } from '@nestjs/common';

export class BadHeaderException extends BadRequestException {

  constructor(public readonly header?: string) {
    super();
  }

}
