import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL
  ?? "mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test";

interface TableRow extends RowDataPacket {
  TABLE_NAME: string;
}

interface RoleRow extends RowDataPacket {
  code: string;
}

interface TriggerRow extends RowDataPacket {
  TRIGGER_NAME: string;
}

interface ConstraintRow extends RowDataPacket {
  CONSTRAINT_NAME: string;
}

interface IndexRow extends RowDataPacket {
  INDEX_NAME: string;
  INDEX_TYPE: string;
}

interface RoutineRow extends RowDataPacket {
  ROUTINE_NAME: string;
}

interface ViewRow extends RowDataPacket {
  TABLE_NAME: string;
}

describe("阶段 1 数据库迁移", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = mysql.createPool(testDatabaseUrl);
  });

  beforeEach(async () => {
    const [tables] = await pool.query<TableRow[]>(
      `SELECT TABLE_NAME
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (
            'users',
            'user_roles',
            'merchant_applications',
            'shops',
            'audit_logs',
            'categories',
            'products',
            'product_price_history',
            'addresses',
            'cart_items',
            'master_orders',
            'shop_orders',
            'order_items',
            'payments'
          )`
    );
    const tableNames = new Set(tables.map((row) => row.TABLE_NAME));
    if (tableNames.has("payments")) {
      await pool.query("DELETE FROM payments");
    }
    if (tableNames.has("order_items")) {
      await pool.query("DELETE FROM order_items");
    }
    if (tableNames.has("shop_orders")) {
      await pool.query("DELETE FROM shop_orders");
    }
    if (tableNames.has("master_orders")) {
      await pool.query("DELETE FROM master_orders");
    }
    if (tableNames.has("cart_items")) {
      await pool.query("DELETE FROM cart_items");
    }
    if (tableNames.has("addresses")) {
      await pool.query("DELETE FROM addresses");
    }
    if (tableNames.has("product_price_history")) {
      await pool.query("DELETE FROM product_price_history");
    }
    if (tableNames.has("products")) {
      await pool.query("DELETE FROM products");
    }
    if (tableNames.has("categories")) {
      await pool.query("DELETE FROM categories");
    }
    if (tableNames.has("audit_logs")) {
      await pool.query("DELETE FROM audit_logs");
    }
    if (tableNames.has("shops")) {
      await pool.query("DELETE FROM shops");
    }
    if (tableNames.has("merchant_applications")) {
      await pool.query("DELETE FROM merchant_applications");
    }
    if (tableNames.has("user_roles")) {
      await pool.query("DELETE FROM user_roles");
    }
    if (tableNames.has("users")) {
      await pool.query("DELETE FROM users");
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("创建认证表和迁移记录表", async () => {
    const [rows] = await pool.query<TableRow[]>(
      `SELECT TABLE_NAME
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()`
    );
    const tableNames = rows.map((row) => row.TABLE_NAME);

    expect(tableNames).toEqual(expect.arrayContaining([
      "users",
      "roles",
      "user_roles",
      "sessions",
      "merchant_applications",
      "shops",
      "audit_logs",
      "categories",
      "products",
      "product_price_history",
      "addresses",
      "cart_items",
      "master_orders",
      "shop_orders",
      "order_items",
      "payments",
      "schema_migrations"
    ]));
  });

  it("创建商户入驻审计触发器", async () => {
    const [rows] = await pool.query<TriggerRow[]>(
      `SELECT TRIGGER_NAME
         FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
          AND TRIGGER_NAME = 'trg_merchant_applications_status_audit'`
    );

    expect(rows.map((row) => row.TRIGGER_NAME)).toEqual(["trg_merchant_applications_status_audit"]);
  });

  it("创建开店申请和店铺唯一约束", async () => {
    const [rows] = await pool.query<ConstraintRow[]>(
      `SELECT CONSTRAINT_NAME
         FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('merchant_applications', 'shops')
          AND CONSTRAINT_TYPE = 'UNIQUE'
        ORDER BY CONSTRAINT_NAME`
    );

    expect(rows.map((row) => row.CONSTRAINT_NAME)).toEqual(expect.arrayContaining([
      "uq_merchant_applications_user",
      "uq_shops_name",
      "uq_shops_owner_user"
    ]));
  });

  it("创建商品目录索引和触发器", async () => {
    const [indexRows] = await pool.query<IndexRow[]>(
      `SELECT INDEX_NAME, INDEX_TYPE
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'`
    );
    const indexNames = indexRows.map((row) => row.INDEX_NAME);

    expect(indexNames).toEqual(expect.arrayContaining([
      "idx_products_category_status_id",
      "idx_products_shop_status_updated",
      "idx_products_status_updated",
      "ft_products_name_description"
    ]));
    expect(indexRows.some((row) => row.INDEX_NAME === "ft_products_name_description" && row.INDEX_TYPE === "FULLTEXT"))
      .toBe(true);

    const [triggerRows] = await pool.query<TriggerRow[]>(
      `SELECT TRIGGER_NAME
         FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
          AND TRIGGER_NAME IN ('trg_products_price_history', 'trg_products_audit')
        ORDER BY TRIGGER_NAME`
    );

    expect(triggerRows.map((row) => row.TRIGGER_NAME)).toEqual([
      "trg_products_audit",
      "trg_products_price_history"
    ]);
  });

  it("创建订单域表、索引、触发器、视图和结算存储过程", async () => {
    const [indexRows] = await pool.query<IndexRow[]>(
      `SELECT INDEX_NAME, INDEX_TYPE
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('cart_items', 'master_orders', 'shop_orders', 'order_items', 'audit_logs')`
    );
    const indexNames = indexRows.map((row) => row.INDEX_NAME);

    expect(indexNames).toEqual(expect.arrayContaining([
      "uq_cart_items_user_product",
      "uq_master_orders_buyer_checkout",
      "idx_master_orders_buyer_created",
      "idx_shop_orders_shop_status_updated",
      "idx_order_items_product_shop_order",
      "idx_audit_logs_actor_created"
    ]));

    const [triggerRows] = await pool.query<TriggerRow[]>(
      `SELECT TRIGGER_NAME
         FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
          AND TRIGGER_NAME IN ('trg_master_orders_audit', 'trg_shop_orders_audit', 'trg_user_roles_audit')
        ORDER BY TRIGGER_NAME`
    );

    expect(triggerRows.map((row) => row.TRIGGER_NAME)).toEqual([
      "trg_master_orders_audit",
      "trg_shop_orders_audit",
      "trg_user_roles_audit"
    ]);

    const [routineRows] = await pool.query<RoutineRow[]>(
      `SELECT ROUTINE_NAME
         FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = DATABASE()
          AND ROUTINE_TYPE = 'PROCEDURE'
          AND ROUTINE_NAME = 'sp_checkout_cart'`
    );

    expect(routineRows.map((row) => row.ROUTINE_NAME)).toEqual(["sp_checkout_cart"]);

    const [viewRows] = await pool.query<ViewRow[]>(
      `SELECT TABLE_NAME
         FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('v_member_order_details', 'v_effective_product_sales', 'v_shop_sales_summary')
        ORDER BY TABLE_NAME`
    );

    expect(viewRows.map((row) => row.TABLE_NAME)).toEqual([
      "v_effective_product_sales",
      "v_member_order_details",
      "v_shop_sales_summary"
    ]);
  });

  it("拒绝非法分类状态、商品状态和非正价格", async () => {
    await expect(pool.execute(
      "INSERT INTO categories (name, description, status) VALUES (?, ?, ?)",
      ["非法分类", "用于验证约束", "UNKNOWN"]
    )).rejects.toMatchObject({ code: "ER_CHECK_CONSTRAINT_VIOLATED" });

    const [userResult] = await pool.execute<mysql.ResultSetHeader>(
      `INSERT INTO users (username, password_hash, display_name, phone_cipher, phone_iv)
       VALUES (?, ?, ?, ?, ?)`,
      ["catalog_owner", "hash", "目录店主", Buffer.from("cipher"), Buffer.alloc(16)]
    );
    const [shopResult] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO shops (owner_user_id, name, description) VALUES (?, ?, ?)",
      [userResult.insertId, "目录测试店", "用于验证商品约束"]
    );
    const [categoryResult] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO categories (name, description) VALUES (?, ?)",
      ["测试分类", "用于验证商品约束"]
    );

    await expect(pool.execute(
      `INSERT INTO products (shop_id, category_id, name, description, price, stock, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [shopResult.insertId, categoryResult.insertId, "非法商品", "用于验证商品约束", "1.00", 1, "UNKNOWN"]
    )).rejects.toMatchObject({ code: "ER_CHECK_CONSTRAINT_VIOLATED" });

    await expect(pool.execute(
      `INSERT INTO products (shop_id, category_id, name, description, price, stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shopResult.insertId, categoryResult.insertId, "零价商品", "用于验证价格约束", "0.00", 1]
    )).rejects.toMatchObject({ code: "ER_CHECK_CONSTRAINT_VIOLATED" });
  });

  it("写入三种固定角色", async () => {
    const [rows] = await pool.query<RoleRow[]>("SELECT code FROM roles ORDER BY code");
    expect(rows.map((row) => row.code)).toEqual(["ADMIN", "MEMBER", "OWNER"]);
  });

  it("拒绝重复用户名和非法用户状态", async () => {
    const values = ["duplicate_user", "hash", "重复用户", Buffer.from("cipher"), Buffer.alloc(16), "ACTIVE"];
    await pool.execute(
      `INSERT INTO users (username, password_hash, display_name, phone_cipher, phone_iv, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      values
    );

    await expect(pool.execute(
      `INSERT INTO users (username, password_hash, display_name, phone_cipher, phone_iv, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      values
    )).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });

    await expect(pool.execute(
      `INSERT INTO users (username, password_hash, display_name, phone_cipher, phone_iv, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["invalid_status", "hash", "非法状态", Buffer.from("cipher"), Buffer.alloc(16), "UNKNOWN"]
    )).rejects.toMatchObject({ code: "ER_CHECK_CONSTRAINT_VIOLATED" });
  });

  it("拒绝重复的用户角色关系", async () => {
    const [userResult] = await pool.execute<mysql.ResultSetHeader>(
      `INSERT INTO users (username, password_hash, display_name, phone_cipher, phone_iv)
       VALUES (?, ?, ?, ?, ?)`,
      ["role_user", "hash", "角色用户", Buffer.from("cipher"), Buffer.alloc(16)]
    );
    const [roleRows] = await pool.query<(RowDataPacket & { id: number })[]>(
      "SELECT id FROM roles WHERE code = 'MEMBER'"
    );
    const roleId = roleRows[0]?.id;
    if (roleId === undefined) {
      throw new Error("MEMBER 角色不存在");
    }

    await pool.execute(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userResult.insertId, roleId]
    );
    await expect(pool.execute(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userResult.insertId, roleId]
    )).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });
  });
});
