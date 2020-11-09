import { OpenAPIV3 } from 'openapi-types';
import { OpenIdConnectAuthGuard } from './open-id-connect.auth-guard';
import { ModuleRef } from '@nestjs/core';
import { Injectable } from '@nestjs/common';
import { AuthGuard } from './auth-guard';

@Injectable()
export class AuthGuardFactory {

  constructor(
    private readonly moduleRef: ModuleRef,
  ) {
  }

  public async create(scheme: OpenAPIV3.SecuritySchemeObject): Promise<AuthGuard> {
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
