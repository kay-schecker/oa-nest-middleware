import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OpenAPIV3 } from 'openapi-types';
import { AuthGuard } from './auth-guard';
import { OpenIdConnectAuthGuard } from './open-id-connect.auth-guard';

@Injectable()
export class AuthGuardFactory {

  constructor(
    private readonly moduleRef: ModuleRef,
  ) {
  }

  public async create(scheme: OpenAPIV3.SecuritySchemeObject): Promise<AuthGuard> {
    switch (scheme.type) {
      case 'openIdConnect':

        const guard = await this.moduleRef.create(OpenIdConnectAuthGuard);
        await guard.init(scheme)
        return guard;

      default:
        throw new Error(`Security scheme of type "${scheme.type}" currently not supported, please open a pull request`)
    }
  }

}
