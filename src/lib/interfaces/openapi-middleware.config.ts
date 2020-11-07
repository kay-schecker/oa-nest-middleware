import { Request } from 'express';
import { Type } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import { OpenApiAdapter } from './openapi-adapter';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { OpenAPIV3 } from 'openapi-types';

export const OpenApiMiddlewareConfig = Symbol('OpenApiMiddlewareConfig');

export interface OpenApiMiddlewareConfig {

  spec: OpenAPIV3.Document
  adapter?: Type<OpenApiAdapter>,
  excludes?: (string | RouteInfo)[]
  routes?: (string | Type<any> | RouteInfo)[]

  exceptions?: Partial<{
    operationNotFound: HttpException | false | ((req: Request) => HttpException),
    badContentType: HttpException | false | ((req: Request) => HttpException),
  }>

}
