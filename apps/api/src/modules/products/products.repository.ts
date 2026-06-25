import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  PaginatedProducts,
  PriceHistoryEntry,
  Product,
  ProductInput,
  ProductStatus,
  ProductUpdate,
  StockUpdate
} from "@novamall/shared";

import { AppError } from "../../errors/app-error.js";

interface ProductRow extends RowDataPacket {
  id: string;
  shop_id: string;
  shop_name: string;
  category_id: string;
  category_name: string;
  name: string;
  price: string;
  stock: number;
  description: string;
  image_path: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PriceHistoryRow extends RowDataPacket {
  id: string;
  old_price: string;
  new_price: string;
  changed_by: string | null;
  changed_at: Date | string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface ShopOwnerRow extends RowDataPacket {
  shop_id: string;
}

export interface ProductListQuery {
  page: number;
  pageSize: number;
  categoryId?: string | undefined;
  keyword?: string | undefined;
  sort?: "newest" | "priceAsc" | "priceDesc" | "relevance" | undefined;
}

export interface OwnerProductListQuery {
  page: number;
  pageSize: number;
  status?: ProductStatus | undefined;
}

const productSelectSql = `SELECT
  CAST(p.id AS CHAR) AS id,
  CAST(p.shop_id AS CHAR) AS shop_id,
  s.name AS shop_name,
  CAST(p.category_id AS CHAR) AS category_id,
  c.name AS category_name,
  p.name,
  CAST(p.price AS CHAR) AS price,
  p.stock,
  p.description,
  p.image_path,
  p.status,
  p.created_at,
  p.updated_at
 FROM products p
 JOIN shops s ON s.id = p.shop_id
 JOIN categories c ON c.id = p.category_id`;

const publicWhere = "WHERE p.status = 'ON_SALE' AND s.status = 'ACTIVE' AND c.status = 'ACTIVE'";

export class ProductsRepository {
  constructor(private readonly pool: Pool) {}

  // ---- Public ----

  async listProducts(query: ProductListQuery): Promise<PaginatedProducts> {
    const conditions: string[] = [publicWhere];
    const params: (string | number)[] = [];
    const useFulltext = query.keyword !== undefined && query.keyword.trim().length > 0;

    if (query.categoryId !== undefined) {
      conditions.push("AND p.category_id = ?");
      params.push(query.categoryId);
    }

    if (useFulltext) {
      conditions.push("AND MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)");
      params.push(query.keyword!.trim());
    }

    const whereSql = conditions.join(" ");

    const [countRows] = await this.pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM products p
       JOIN shops s ON s.id = p.shop_id
       JOIN categories c ON c.id = p.category_id
       ${whereSql}`,
      params
    );

    const sort = query.sort ?? "newest";
    let orderSql: string;
    if (sort === "relevance" && useFulltext) {
      orderSql = `ORDER BY MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE) DESC, p.created_at DESC`;
      params.push(query.keyword!.trim());
    } else if (sort === "priceAsc") {
      orderSql = "ORDER BY p.price ASC, p.id DESC";
    } else if (sort === "priceDesc") {
      orderSql = "ORDER BY p.price DESC, p.id DESC";
    } else {
      orderSql = "ORDER BY p.created_at DESC, p.id DESC";
    }

    const offset = (query.page - 1) * query.pageSize;
    const [rows] = await this.pool.query<ProductRow[]>(
      `${productSelectSql}
       ${whereSql}
       ${orderSql}
       LIMIT ? OFFSET ?`,
      [...params, query.pageSize, offset]
    );

    return {
      data: rows.map(mapProduct),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: countRows[0]?.total ?? 0
      }
    };
  }

  async findById(productId: string): Promise<Product | null> {
    const [rows] = await this.pool.query<ProductRow[]>(
      `${productSelectSql}
       WHERE p.id = ? AND ${publicWhere}`,
      [productId]
    );
    return rows[0] === undefined ? null : mapProduct(rows[0]);
  }

  // ---- Owner ----

  async listForOwner(shopId: string, query: OwnerProductListQuery): Promise<PaginatedProducts> {
    const conditions = ["WHERE p.shop_id = ?"];
    const params: (string | number)[] = [shopId];

    if (query.status !== undefined) {
      conditions.push("AND p.status = ?");
      params.push(query.status);
    }

    const whereSql = conditions.join(" ");

    const [countRows] = await this.pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM products p
       JOIN shops s ON s.id = p.shop_id
       JOIN categories c ON c.id = p.category_id
       ${whereSql}`,
      params
    );

    const offset = (query.page - 1) * query.pageSize;
    const [rows] = await this.pool.query<ProductRow[]>(
      `${productSelectSql}
       ${whereSql}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, query.pageSize, offset]
    );

    return {
      data: rows.map(mapProduct),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: countRows[0]?.total ?? 0
      }
    };
  }

  async create(shopId: string, userId: string, input: ProductInput): Promise<Product> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await setAuditContext(connection, userId);

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO products (shop_id, category_id, name, price, stock, description, image_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [shopId, input.categoryId, input.name, input.price, input.stock, input.description, input.imagePath]
      );

      const product = await findProductById(connection, String(result.insertId));
      if (product === null) {
        throw new AppError(500, "INTERNAL_ERROR", "商品创建失败");
      }
      await connection.commit();
      return product;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await clearAuditContext(connection);
      connection.release();
    }
  }

  async update(
    productId: string,
    shopId: string,
    userId: string,
    input: ProductUpdate
  ): Promise<Product> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await findProductByIdForUpdate(connection, productId);
      if (existing === null) {
        throw new AppError(404, "NOT_FOUND", "商品不存在");
      }
      if (existing.shopId !== shopId) {
        throw new AppError(403, "PRODUCT_NOT_OWNED", "商品不属于当前店铺");
      }
      if (existing.status === "ARCHIVED") {
        throw new AppError(409, "PRODUCT_STATUS_CONFLICT", "已归档商品不可编辑");
      }

      const sets: string[] = [];
      const params: (string | number)[] = [];

      if (input.name !== undefined) {
        sets.push("name = ?");
        params.push(input.name);
      }
      if (input.price !== undefined) {
        sets.push("price = ?");
        params.push(input.price);
        await setAuditContext(connection, userId);
      }
      if (input.stock !== undefined) {
        sets.push("stock = ?");
        params.push(input.stock);
      }
      if (input.description !== undefined) {
        sets.push("description = ?");
        params.push(input.description);
      }
      if (input.categoryId !== undefined) {
        sets.push("category_id = ?");
        params.push(input.categoryId);
      }
      if (input.imagePath !== undefined) {
        sets.push("image_path = ?");
        params.push(input.imagePath);
      }

      if (sets.length > 0) {
        params.push(productId);
        await connection.execute(
          `UPDATE products SET ${sets.join(", ")} WHERE id = ?`,
          params
        );
      }

      const product = await findProductById(connection, productId);
      if (product === null) {
        throw new AppError(500, "INTERNAL_ERROR", "商品更新失败");
      }
      await connection.commit();
      return product;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await clearAuditContext(connection);
      connection.release();
    }
  }

  async getOwnerProduct(productId: string, shopId: string): Promise<Product | null> {
    const [rows] = await this.pool.query<ProductRow[]>(
      `${productSelectSql}
       WHERE p.id = ? AND p.shop_id = ?`,
      [productId, shopId]
    );
    return rows[0] === undefined ? null : mapProduct(rows[0]);
  }

  async updateStock(productId: string, shopId: string, input: StockUpdate): Promise<Product> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await findProductByIdForUpdate(connection, productId);
      if (existing === null) {
        throw new AppError(404, "NOT_FOUND", "商品不存在");
      }
      if (existing.shopId !== shopId) {
        throw new AppError(403, "PRODUCT_NOT_OWNED", "商品不属于当前店铺");
      }

      await connection.execute(
        "UPDATE products SET stock = ? WHERE id = ?",
        [input.stock, productId]
      );

      const product = await findProductById(connection, productId);
      if (product === null) {
        throw new AppError(500, "INTERNAL_ERROR", "库存更新失败");
      }
      await connection.commit();
      return product;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async publish(productId: string, shopId: string): Promise<Product> {
    return this.transitionStatus(productId, shopId, "ON_SALE", ["DRAFT", "OFF_SALE"]);
  }

  async unpublish(productId: string, shopId: string): Promise<Product> {
    return this.transitionStatus(productId, shopId, "OFF_SALE", ["ON_SALE"]);
  }

  async archive(productId: string, shopId: string): Promise<Product> {
    return this.transitionStatus(productId, shopId, "ARCHIVED", ["DRAFT", "ON_SALE", "OFF_SALE"]);
  }

  private async transitionStatus(
    productId: string,
    shopId: string,
    targetStatus: ProductStatus,
    allowedFrom: ProductStatus[]
  ): Promise<Product> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await findProductByIdForUpdate(connection, productId);
      if (existing === null) {
        throw new AppError(404, "NOT_FOUND", "商品不存在");
      }
      if (existing.shopId !== shopId) {
        throw new AppError(403, "PRODUCT_NOT_OWNED", "商品不属于当前店铺");
      }
      if (!allowedFrom.includes(existing.status)) {
        throw new AppError(409, "PRODUCT_STATUS_CONFLICT", "当前商品状态不允许此操作");
      }

      await connection.execute(
        "UPDATE products SET status = ? WHERE id = ? AND status IN (?)",
        [targetStatus, productId, allowedFrom.join(",")]
      );

      const product = await findProductById(connection, productId);
      if (product === null) {
        throw new AppError(500, "INTERNAL_ERROR", "商品状态更新失败");
      }
      await connection.commit();
      return product;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getPriceHistory(productId: string): Promise<PriceHistoryEntry[]> {
    const [rows] = await this.pool.query<PriceHistoryRow[]>(
      `SELECT
         CAST(id AS CHAR) AS id,
         CAST(old_price AS CHAR) AS old_price,
         CAST(new_price AS CHAR) AS new_price,
         CAST(changed_by AS CHAR) AS changed_by,
         changed_at
       FROM product_price_history
       WHERE product_id = ?
       ORDER BY changed_at DESC`,
      [productId]
    );
    return rows.map(mapPriceHistoryEntry);
  }

  async findShopIdByOwnerUserId(ownerUserId: string): Promise<string | null> {
    const [rows] = await this.pool.query<ShopOwnerRow[]>(
      "SELECT CAST(id AS CHAR) AS shop_id FROM shops WHERE owner_user_id = ? AND status = 'ACTIVE'",
      [ownerUserId]
    );
    return rows[0]?.shop_id ?? null;
  }
}

async function findProductById(connection: PoolConnection, id: string): Promise<Product | null> {
  const [rows] = await connection.query<ProductRow[]>(
    `${productSelectSql}
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] === undefined ? null : mapProduct(rows[0]);
}

async function findProductByIdForUpdate(
  connection: PoolConnection,
  id: string
): Promise<{ shopId: string; status: ProductStatus } | null> {
  const [rows] = await connection.query<(RowDataPacket & { shop_id: string; status: string })[]>(
    `SELECT CAST(shop_id AS CHAR) AS shop_id, status
     FROM products
     WHERE id = ?
     FOR UPDATE`,
    [id]
  );
  const row = rows[0];
  if (row === undefined || !isProductStatus(row.status)) {
    return null;
  }
  return { shopId: row.shop_id, status: row.status };
}

async function setAuditContext(connection: PoolConnection, userId: string): Promise<void> {
  await connection.query("SET @novamall_actor_user_id = ?", [userId]);
}

async function clearAuditContext(connection: PoolConnection): Promise<void> {
  await connection.query("SET @novamall_actor_user_id = NULL");
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    shopName: row.shop_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    price: row.price,
    stock: row.stock,
    description: row.description,
    imagePath: row.image_path,
    status: parseProductStatus(row.status),
    createdAt: formatRequiredDate(row.created_at),
    updatedAt: formatRequiredDate(row.updated_at)
  };
}

function mapPriceHistoryEntry(row: PriceHistoryRow): PriceHistoryEntry {
  return {
    id: row.id,
    oldPrice: row.old_price,
    newPrice: row.new_price,
    changedBy: row.changed_by,
    changedAt: formatRequiredDate(row.changed_at)
  };
}

function parseProductStatus(value: string): ProductStatus {
  if (isProductStatus(value)) {
    return value;
  }
  throw new AppError(500, "INTERNAL_ERROR", "商品状态异常");
}

function isProductStatus(value: string): value is ProductStatus {
  return value === "DRAFT" || value === "ON_SALE" || value === "OFF_SALE" || value === "ARCHIVED";
}

function formatRequiredDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
