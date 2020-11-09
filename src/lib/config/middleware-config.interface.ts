import { Type } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import { OpenAPIV3 } from 'openapi-types';
import { MiddlewareAdapter } from '../adapter/middleware-adapter.interface';

export const MiddlewareConfig = Symbol('MiddlewareConfig');

export interface MiddlewareConfig {

  spec: OpenAPIV3.Document
  adapter?: Type<MiddlewareAdapter>,
  excludes?: (string | RouteInfo)[]
  routes?: (string | Type<any> | RouteInfo)[]

}
