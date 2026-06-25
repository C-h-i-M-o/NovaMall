import type { RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import type { ProductsService } from "./products.service.js";

export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  listProducts: RequestHandler = async (request, response, next) => {
    try {
      const result = await this.service.listProducts(request.query);
      response.json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  };

  getProduct: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.getProduct(pathParam(request.params.productId))
      });
    } catch (error) {
      next(error);
    }
  };

  listForOwner: RequestHandler = async (request, response, next) => {
    try {
      const result = await this.service.listForOwner(currentUserId(request), request.query);
      response.json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  };

  create: RequestHandler = async (request, response, next) => {
    try {
      response.status(201).json({
        success: true,
        data: await this.service.create(currentUserId(request), request.body)
      });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.update(
          currentUserId(request),
          pathParam(request.params.productId),
          request.body
        )
      });
    } catch (error) {
      next(error);
    }
  };

  getOwnerProduct: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.getOwnerProduct(currentUserId(request), pathParam(request.params.productId))
      });
    } catch (error) {
      next(error);
    }
  };

  updateStock: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.updateStock(
          currentUserId(request),
          pathParam(request.params.productId),
          request.body
        )
      });
    } catch (error) {
      next(error);
    }
  };

  publish: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.publish(currentUserId(request), pathParam(request.params.productId))
      });
    } catch (error) {
      next(error);
    }
  };

  unpublish: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.unpublish(currentUserId(request), pathParam(request.params.productId))
      });
    } catch (error) {
      next(error);
    }
  };

  archive: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.archive(currentUserId(request), pathParam(request.params.productId))
      });
    } catch (error) {
      next(error);
    }
  };

  getPriceHistory: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.getPriceHistory(
          currentUserId(request),
          pathParam(request.params.productId)
        )
      });
    } catch (error) {
      next(error);
    }
  };
}

function currentUserId(request: Parameters<RequestHandler>[0]): string {
  const userId = request.currentUser?.id;
  if (userId === undefined) {
    throw new AppError(401, "AUTH_REQUIRED", "请先登录");
  }
  return userId;
}

function pathParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
