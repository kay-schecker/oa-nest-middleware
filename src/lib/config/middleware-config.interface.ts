import { Request } from 'express';
import { Type } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { OpenAPIV3 } from 'openapi-types';
import { MiddlewareAdapter } from '../adapter/middleware-adapter.interface';

export const MiddlewareConfig = Symbol('MiddlewareConfig');

type Error = HttpException | false | (() => HttpException);

export interface MiddlewareConfig {

  spec: OpenAPIV3.Document
  adapter?: Type<MiddlewareAdapter>,
  excludes?: (string | RouteInfo)[]
  routes?: (string | Type<any> | RouteInfo)[]

  exceptions?: Partial<{
    reqUnauthorized: Error,
    reqOperationNotFound: Error,
    reqBadHeader: Error, // Content-Type header not supported
    reqContentType: Error, // Content-Type header not supported
    reqBadContentType: Error, // Content-Type header not supported
    resBadContentType: Error, // Response Content-Type not found by req
  }>

}
