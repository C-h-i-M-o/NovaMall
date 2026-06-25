import {
  productInputSchema,
  productStatusSchema,
  productUpdateSchema,
  stockUpdateSchema
} from "@novamall/shared";
import { z } from "zod";

import { AppError } from "../../errors/app-error.js";
import type { ProductsRepository } from "./products.repository.js";

const publicListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().regex(/^\d+$/).optional(),
  keyword: z.string().trim().max(200).optional(),
  sort: z.enum(["newest", "priceAsc", "priceDesc", "relevance"]).optional()
});

const ownerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: productStatusSchema.optional()
});

export class ProductsService {
  constructor(private readonly repository: ProductsRepository) {}

  // ---- Public ----

  async listProducts(query: unknown) {
    const parsed = publicListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "商品列表查询参数不合法");
    }
    if (parsed.data.sort === "relevance" && (parsed.data.keyword === undefined || parsed.data.keyword.trim().length === 0)) {
      throw new AppError(400, "VALIDATION_ERROR", "按相关度排序需要提供搜索关键词");
    }
    return this.repository.listProducts(parsed.data);
  }

  async getProduct(productId: string) {
    assertNumericId(productId);
    const product = await this.repository.findById(productId);
    if (product === null) {
      throw new AppError(404, "NOT_FOUND", "商品不存在或已下架");
    }
    return product;
  }

  // ---- Owner ----

  async listForOwner(ownerUserId: string, query: unknown) {
    const shopId = await this.requireShop(ownerUserId);
    const parsed = ownerListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "商品列表查询参数不合法");
    }
    return this.repository.listForOwner(shopId, parsed.data);
  }

  async create(ownerUserId: string, input: unknown) {
    const shopId = await this.requireShop(ownerUserId);
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "商品参数不合法");
    }
    return this.repository.create(shopId, ownerUserId, parsed.data);
  }

  async update(ownerUserId: string, productId: string, input: unknown) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    const parsed = productUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "商品更新参数不合法");
    }
    return this.repository.update(productId, shopId, ownerUserId, parsed.data);
  }

  async getOwnerProduct(ownerUserId: string, productId: string) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    const product = await this.repository.getOwnerProduct(productId, shopId);
    if (product === null) {
      throw new AppError(404, "NOT_FOUND", "商品不存在");
    }
    return product;
  }

  async updateStock(ownerUserId: string, productId: string, input: unknown) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    const parsed = stockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "库存参数不合法");
    }
    return this.repository.updateStock(productId, shopId, parsed.data);
  }

  async publish(ownerUserId: string, productId: string) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    return this.repository.publish(productId, shopId);
  }

  async unpublish(ownerUserId: string, productId: string) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    return this.repository.unpublish(productId, shopId);
  }

  async archive(ownerUserId: string, productId: string) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    return this.repository.archive(productId, shopId);
  }

  async getPriceHistory(ownerUserId: string, productId: string) {
    const shopId = await this.requireShop(ownerUserId);
    assertNumericId(productId);
    const product = await this.repository.getOwnerProduct(productId, shopId);
    if (product === null) {
      throw new AppError(404, "NOT_FOUND", "商品不存在");
    }
    return this.repository.getPriceHistory(productId);
  }

  private async requireShop(ownerUserId: string): Promise<string> {
    const shopId = await this.repository.findShopIdByOwnerUserId(ownerUserId);
    if (shopId === null) {
      throw new AppError(404, "NOT_FOUND", "尚未拥有店铺");
    }
    return shopId;
  }
}

function assertNumericId(value: string): void {
  if (!/^\d+$/.test(value)) {
    throw new AppError(404, "NOT_FOUND", "商品不存在");
  }
}
