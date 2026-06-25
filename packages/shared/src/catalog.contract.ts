import { z } from "zod";

export const productStatusSchema = z.enum(["DRAFT", "ON_SALE", "OFF_SALE", "ARCHIVED"]);
export const categoryStatusSchema = z.enum(["ACTIVE", "DISABLED"]);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().nonnegative().optional()
}).strict();

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().nonnegative().optional()
}).strict();

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "价格必须为非负两位小数字符串"),
  stock: z.number().int().nonnegative(),
  description: z.string().trim().min(1).max(5000),
  categoryId: z.string().regex(/^\d+$/, "分类 ID 必须为数字字符串"),
  imagePath: z.string().trim().max(255)
}).strict();

export const productUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "价格必须为非负两位小数字符串").optional(),
  stock: z.number().int().nonnegative().optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  categoryId: z.string().regex(/^\d+$/, "分类 ID 必须为数字字符串").optional(),
  imagePath: z.string().trim().max(255).optional()
}).strict();

export const stockUpdateSchema = z.object({
  stock: z.number().int().nonnegative()
}).strict();

const isoStringSchema = z.string().min(1);

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  status: categoryStatusSchema,
  createdAt: isoStringSchema,
  updatedAt: isoStringSchema
});

export const productSchema = z.object({
  id: z.string(),
  shopId: z.string(),
  shopName: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  name: z.string(),
  price: z.string(),
  stock: z.number().int(),
  description: z.string(),
  imagePath: z.string(),
  status: productStatusSchema,
  createdAt: isoStringSchema,
  updatedAt: isoStringSchema
});

export const priceHistoryEntrySchema = z.object({
  id: z.string(),
  oldPrice: z.string(),
  newPrice: z.string(),
  changedBy: z.string().nullable(),
  changedAt: isoStringSchema
});

export const paginatedCategoriesSchema = z.object({
  data: z.array(categorySchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative()
  })
});

export const paginatedProductsSchema = z.object({
  data: z.array(productSchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative()
  })
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type CategoryStatus = z.infer<typeof categoryStatusSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type StockUpdate = z.infer<typeof stockUpdateSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type PriceHistoryEntry = z.infer<typeof priceHistoryEntrySchema>;
export type PaginatedCategories = z.infer<typeof paginatedCategoriesSchema>;
export type PaginatedProducts = z.infer<typeof paginatedProductsSchema>;
