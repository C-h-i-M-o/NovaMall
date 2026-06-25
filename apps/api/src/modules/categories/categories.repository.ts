import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  Category,
  CategoryInput,
  CategoryStatus,
  CategoryUpdate,
  PaginatedCategories
} from "@novamall/shared";

import { AppError } from "../../errors/app-error.js";

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

export interface CategoryListQuery {
  page: number;
  pageSize: number;
}

export class CategoriesRepository {
  constructor(private readonly pool: Pool) {}

  async listAll(): Promise<Category[]> {
    const [rows] = await this.pool.query<CategoryRow[]>(
      `${categorySelectSql}
       WHERE c.status = 'ACTIVE'
       ORDER BY c.sort_order ASC, c.id ASC`
    );
    return rows.map(mapCategory);
  }

  async listForAdmin(query: CategoryListQuery): Promise<PaginatedCategories> {
    const [countRows] = await this.pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM categories"
    );
    const offset = (query.page - 1) * query.pageSize;
    const [rows] = await this.pool.query<CategoryRow[]>(
      `${categorySelectSql}
       ORDER BY c.sort_order ASC, c.id ASC
       LIMIT ? OFFSET ?`,
      [query.pageSize, offset]
    );

    return {
      data: rows.map(mapCategory),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: countRows[0]?.total ?? 0
      }
    };
  }

  async create(input: CategoryInput): Promise<Category> {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(
        `INSERT INTO categories (name, description, sort_order)
         VALUES (?, ?, ?)`,
        [input.name, input.description ?? null, input.sortOrder ?? 0]
      );
      const category = await this.findById(String(result.insertId));
      if (category === null) {
        throw new AppError(500, "INTERNAL_ERROR", "分类创建失败");
      }
      return category;
    } catch (error) {
      if (isMysqlErrorCode(error, "ER_DUP_ENTRY")) {
        throw new AppError(409, "CATEGORY_NAME_TAKEN", "分类名称已被使用");
      }
      throw error;
    }
  }

  async update(id: string, input: CategoryUpdate): Promise<Category> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.name !== undefined) {
      sets.push("name = ?");
      params.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push("description = ?");
      params.push(input.description);
    }
    if (input.sortOrder !== undefined) {
      sets.push("sort_order = ?");
      params.push(input.sortOrder);
    }

    if (sets.length === 0) {
      const category = await this.findById(id);
      if (category === null) {
        throw new AppError(404, "NOT_FOUND", "分类不存在");
      }
      return category;
    }

    params.push(id);

    try {
      await this.pool.execute(
        `UPDATE categories SET ${sets.join(", ")} WHERE id = ?`,
        params
      );
    } catch (error) {
      if (isMysqlErrorCode(error, "ER_DUP_ENTRY")) {
        throw new AppError(409, "CATEGORY_NAME_TAKEN", "分类名称已被使用");
      }
      throw error;
    }

    const category = await this.findById(id);
    if (category === null) {
      throw new AppError(404, "NOT_FOUND", "分类不存在");
    }
    return category;
  }

  async updateStatus(id: string, status: CategoryStatus): Promise<Category> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      "UPDATE categories SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) {
      throw new AppError(404, "NOT_FOUND", "分类不存在");
    }
    const category = await this.findById(id);
    if (category === null) {
      throw new AppError(404, "NOT_FOUND", "分类不存在");
    }
    return category;
  }

  async findById(id: string): Promise<Category | null> {
    const [rows] = await this.pool.query<CategoryRow[]>(
      `${categorySelectSql}
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] === undefined ? null : mapCategory(rows[0]);
  }
}

const categorySelectSql = `SELECT
  CAST(c.id AS CHAR) AS id,
  c.name,
  c.description,
  c.sort_order,
  c.status,
  c.created_at,
  c.updated_at
 FROM categories c`;

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    status: parseCategoryStatus(row.status),
    createdAt: formatRequiredDate(row.created_at),
    updatedAt: formatRequiredDate(row.updated_at)
  };
}

function parseCategoryStatus(value: string): CategoryStatus {
  if (value === "ACTIVE" || value === "DISABLED") {
    return value;
  }
  throw new AppError(500, "INTERNAL_ERROR", "分类状态异常");
}

function formatRequiredDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isMysqlErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === code;
}
