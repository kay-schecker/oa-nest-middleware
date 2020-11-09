import { OpenAPIV3 } from 'openapi-types';
import { OpenIdConnectAuthGuard } from './open-id-connect.auth-guard';
import { ModuleRef } from '@nestjs/core';
import { Injectable } from '@nestjs/common';
import { MiddlewareAuthGuard } from './middleware-auth-guard';
import { MiddlewareLogger } from '../../middleware.logger';

@Injectable()
export class MiddlewareAuthGuardFactory {

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly logger: MiddlewareLogger,
  ) {
  }

  public async create(scheme: OpenAPIV3.SecuritySchemeObject): Promise<MiddlewareAuthGuard> {
    const guard = await this.moduleRef.create(this.getGuardType(scheme));
    await guard.init(scheme as any);
    return guard;
  }

  private getGuardType(scheme: OpenAPIV3.SecuritySchemeObject) {
    switch (scheme.type) {
      case 'openIdConnect':
        return OpenIdConnectAuthGuard;
      default:
        throw new Error(`Security scheme of type "${scheme.type}" currently not supported, please open a pull request`)
    }
  }

}
