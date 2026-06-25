import type { RequestHandler } from "express";

import type { CategoriesService } from "./categories.service.js";

export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  listAll: RequestHandler = async (_request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.listAll()
      });
    } catch (error) {
      next(error);
    }
  };

  listForAdmin: RequestHandler = async (request, response, next) => {
    try {
      const result = await this.service.listForAdmin(request.query);
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
        data: await this.service.create(request.body)
      });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.update(pathParam(request.params.id), request.body)
      });
    } catch (error) {
      next(error);
    }
  };

  disable: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.disable(pathParam(request.params.id))
      });
    } catch (error) {
      next(error);
    }
  };

  enable: RequestHandler = async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await this.service.enable(pathParam(request.params.id))
      });
    } catch (error) {
      next(error);
    }
  };
}

function pathParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
