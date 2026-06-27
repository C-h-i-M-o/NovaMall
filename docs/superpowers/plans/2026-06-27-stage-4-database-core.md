# Stage 4 Database Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Stage 4 数据库技术核心闭环，让 9 项高阶数据库技术都有真实表结构、SQL 对象、API 流程、测试和证据。

**Architecture:** 保持现有 Express 模块边界：`Route -> Controller -> Service -> Repository`，只有 Repository 执行 SQL。新增 `checkout` 模块承接地址、购物车、结算、订单、支付、审计和 Top 10 查询；Stage 3 的 catalog 模块只作为商品数据来源，不混入订单逻辑。

**Tech Stack:** TypeScript, Zod, React, Express, mysql2, MySQL 8.4, dbmate, Vitest, Supertest, pnpm.

---

## File Map

- Create: `docs/phases/04-database-core.md`，阶段 4 规格。
- Create: `packages/shared/src/checkout.contract.ts`，地址、购物车、结算、订单、审计和 Top 10 DTO。
- Modify: `packages/shared/src/errors.ts`，追加 Stage 4 错误码。
- Modify: `packages/shared/src/index.ts`，导出 checkout 合同。
- Create: `packages/shared/tests/checkout.contract.test.ts`，共享合同测试。
- Create: `database/migrations/202606270001_database_core.sql`，订单域表、存储过程、触发器、视图和索引。
- Modify: `apps/api/tests/integration/migration.test.ts`，验证 Stage 4 SQL 对象。
- Create: `apps/api/tests/integration/checkout-api.test.ts`，地址、购物车、结算、支付、取消、店主订单、管理员审计和 Top 10 集成测试。
- Create: `apps/api/src/modules/checkout/checkout.repository.ts`，唯一 SQL 访问层。
- Create: `apps/api/src/modules/checkout/checkout.service.ts`，状态机、错误映射和合同校验。
- Create: `apps/api/src/modules/checkout/checkout.controller.ts`，HTTP 入参、响应和 requestId 传递。
- Create: `apps/api/src/modules/checkout/checkout.routes.ts`，地址、购物车、订单、店主和管理员路由。
- Modify: `apps/api/src/app.ts`，挂载 checkout 路由。
- Modify: `apps/api/src/server.ts`，注入 checkout repository。
- Create: `docs/evidence/database/stage-4-core.md`，用一份精简证据表覆盖 9 项数据库技术。

## Task 1: Stage 4 Shared Contracts

**Files:**
- Create: `packages/shared/tests/checkout.contract.test.ts`
- Create: `packages/shared/src/checkout.contract.ts`
- Modify: `packages/shared/src/errors.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing contract test**

Create `packages/shared/tests/checkout.contract.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  addressInputSchema,
  addressSchema,
  auditLogSchema,
  cartItemInputSchema,
  cartSchema,
  checkoutInputSchema,
  memberOrderSchema,
  shopOrderSchema,
  topProductSchema
} from "../src/checkout.contract.js";
import { apiErrorCodeSchema } from "../src/errors.js";

describe("checkout contracts", () => {
  it("validates address input and output", () => {
    expect(addressInputSchema.parse({
      receiverName: "张三",
      receiverPhone: "13900000000",
      province: "广东省",
      city: "深圳市",
      district: "南山区",
      detail: "科技园 1 号",
      isDefault: true
    }).receiverPhone).toBe("13900000000");
    expect(addressSchema.parse({
      id: "1",
      receiverName: "张三",
      maskedPhone: "139****0000",
      province: "广东省",
      city: "深圳市",
      district: "南山区",
      detail: "科技园 1 号",
      isDefault: true,
      createdAt: "2026-06-27T01:00:00.000Z",
      updatedAt: "2026-06-27T01:00:00.000Z"
    }).id).toBe("1");
  });

  it("validates cart, checkout and order DTOs", () => {
    expect(cartItemInputSchema.parse({ productId: "10", quantity: 2 }).quantity).toBe(2);
    expect(cartSchema.parse({
      items: [{
        id: "1",
        productId: "10",
        productName: "高山苹果",
        shopId: "3",
        shopName: "果园小铺",
        unitPrice: "19.90",
        quantity: 2,
        lineAmount: "39.80",
        stock: 20,
        mainImagePath: "/uploads/products/2026/06/test.png",
        available: true
      }],
      totalAmount: "39.80"
    }).items).toHaveLength(1);
    expect(checkoutInputSchema.parse({
      addressId: "1",
      checkoutToken: "11111111-1111-4111-8111-111111111111"
    }).addressId).toBe("1");
    expect(memberOrderSchema.parse({
      orderNo: "MO202606270001",
      status: "PENDING_PAYMENT",
      totalAmount: "39.80",
      shopOrderCount: 1,
      createdAt: "2026-06-27T01:00:00.000Z"
    }).status).toBe("PENDING_PAYMENT");
  });

  it("validates owner, audit and top product DTOs", () => {
    expect(shopOrderSchema.parse({
      shopOrderNo: "SO202606270001",
      masterOrderNo: "MO202606270001",
      status: "PENDING_SHIPMENT",
      subtotalAmount: "39.80",
      itemCount: 2,
      createdAt: "2026-06-27T01:00:00.000Z"
    }).itemCount).toBe(2);
    expect(auditLogSchema.parse({
      id: "1",
      actorUserId: "2",
      requestId: "11111111-1111-4111-8111-111111111111",
      tableName: "master_orders",
      recordId: "9",
      action: "STATUS_CHANGE",
      createdAt: "2026-06-27T01:00:00.000Z"
    }).tableName).toBe("master_orders");
    expect(topProductSchema.parse({
      productId: "10",
      productName: "高山苹果",
      soldQuantity: 6,
      salesAmount: "119.40",
      salesRank: 1
    }).salesRank).toBe(1);
  });

  it("validates Stage 4 error codes", () => {
    expect(apiErrorCodeSchema.parse("EMPTY_CART")).toBe("EMPTY_CART");
    expect(apiErrorCodeSchema.parse("ADDRESS_NOT_OWNED")).toBe("ADDRESS_NOT_OWNED");
    expect(apiErrorCodeSchema.parse("PRODUCT_UNAVAILABLE")).toBe("PRODUCT_UNAVAILABLE");
    expect(apiErrorCodeSchema.parse("OUT_OF_STOCK")).toBe("OUT_OF_STOCK");
    expect(apiErrorCodeSchema.parse("ORDER_STATE_CONFLICT")).toBe("ORDER_STATE_CONFLICT");
    expect(apiErrorCodeSchema.parse("CHECKOUT_TOKEN_CONFLICT")).toBe("CHECKOUT_TOKEN_CONFLICT");
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
CI=true pnpm --filter @novamall/shared test -- tests/checkout.contract.test.ts
```

Expected: FAIL because `checkout.contract.ts` and the new error codes do not exist.

- [ ] **Step 3: Implement contracts**

Create `packages/shared/src/checkout.contract.ts` with these exports:

```ts
import { z } from "zod";

const idStringSchema = z.string().regex(/^\d+$/);
const moneyStringSchema = z.string().regex(/^\d+\.\d{2}$/);
const isoStringSchema = z.string().min(1);
const phoneSchema = z.string().regex(/^1\d{10}$/);
const uploadPathSchema = z.string().regex(/^\/uploads\/products\/\d{4}\/\d{2}\/[^/]+\.(jpg|jpeg|png|webp)$/).nullable();

export const masterOrderStatusSchema = z.enum(["PENDING_PAYMENT", "PAID", "CANCELED", "COMPLETED"]);
export const shopOrderStatusSchema = z.enum(["PENDING_PAYMENT", "PENDING_SHIPMENT", "SHIPPED", "COMPLETED", "CANCELED", "REFUNDED"]);

export const addressInputSchema = z.object({
  receiverName: z.string().trim().min(2).max(80),
  receiverPhone: phoneSchema,
  province: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  detail: z.string().trim().min(3).max(255),
  isDefault: z.boolean().default(false)
}).strict();

export const addressSchema = z.object({
  id: idStringSchema,
  receiverName: z.string(),
  maskedPhone: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
  detail: z.string(),
  isDefault: z.boolean(),
  createdAt: isoStringSchema,
  updatedAt: isoStringSchema
});

export const cartItemInputSchema = z.object({
  productId: idStringSchema,
  quantity: z.number().int().positive().max(99)
}).strict();

export const cartItemUpdateSchema = z.object({
  quantity: z.number().int().positive().max(99)
}).strict();

export const cartItemSchema = z.object({
  id: idStringSchema,
  productId: idStringSchema,
  productName: z.string(),
  shopId: idStringSchema,
  shopName: z.string(),
  unitPrice: moneyStringSchema,
  quantity: z.number().int().positive(),
  lineAmount: moneyStringSchema,
  stock: z.number().int().nonnegative(),
  mainImagePath: uploadPathSchema,
  available: z.boolean()
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  totalAmount: moneyStringSchema
});

export const checkoutInputSchema = z.object({
  addressId: idStringSchema,
  checkoutToken: z.string().uuid()
}).strict();

export const checkoutResultSchema = z.object({
  orderNo: z.string().min(1)
});

export const memberOrderSchema = z.object({
  orderNo: z.string(),
  status: masterOrderStatusSchema,
  totalAmount: moneyStringSchema,
  shopOrderCount: z.number().int().nonnegative(),
  createdAt: isoStringSchema
});

export const shopOrderSchema = z.object({
  shopOrderNo: z.string(),
  masterOrderNo: z.string(),
  status: shopOrderStatusSchema,
  subtotalAmount: moneyStringSchema,
  itemCount: z.number().int().nonnegative(),
  createdAt: isoStringSchema
});

export const auditLogSchema = z.object({
  id: idStringSchema,
  actorUserId: idStringSchema.nullable(),
  requestId: z.string().nullable(),
  tableName: z.string(),
  recordId: idStringSchema,
  action: z.string(),
  createdAt: isoStringSchema
});

export const topProductSchema = z.object({
  productId: idStringSchema,
  productName: z.string(),
  soldQuantity: z.number().int().nonnegative(),
  salesAmount: moneyStringSchema,
  salesRank: z.number().int().positive()
});

export type MasterOrderStatus = z.infer<typeof masterOrderStatusSchema>;
export type ShopOrderStatus = z.infer<typeof shopOrderStatusSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type Address = z.infer<typeof addressSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CartItemUpdate = z.infer<typeof cartItemUpdateSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
export type MemberOrder = z.infer<typeof memberOrderSchema>;
export type ShopOrder = z.infer<typeof shopOrderSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type TopProduct = z.infer<typeof topProductSchema>;
```

Add the six Stage 4 error codes to `apiErrorCodeSchema`, and export from `packages/shared/src/index.ts`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
CI=true pnpm --filter @novamall/shared test -- tests/checkout.contract.test.ts
CI=true pnpm --filter @novamall/shared typecheck
```

Expected: PASS.

## Task 2: Database Migration, Procedure, Triggers and Views

**Files:**
- Create: `database/migrations/202606270001_database_core.sql`
- Modify: `apps/api/tests/integration/migration.test.ts`

- [ ] **Step 1: Write failing migration assertions**

Extend `migration.test.ts` so the table existence assertion also expects:

```ts
"addresses",
"cart_items",
"master_orders",
"shop_orders",
"order_items",
"payments"
```

Add assertions for:

```ts
expect(indexNames).toEqual(expect.arrayContaining([
  "uq_cart_items_user_product",
  "uq_master_orders_buyer_checkout",
  "idx_master_orders_buyer_created",
  "idx_shop_orders_shop_status_updated",
  "idx_order_items_product_shop_order",
  "idx_audit_logs_actor_created"
]));
expect(triggerNames).toEqual(expect.arrayContaining([
  "trg_master_orders_audit",
  "trg_shop_orders_audit",
  "trg_user_roles_audit"
]));
expect(routineNames).toEqual(expect.arrayContaining(["sp_checkout_cart"]));
expect(viewNames).toEqual(expect.arrayContaining([
  "v_member_order_details",
  "v_effective_product_sales",
  "v_shop_sales_summary"
]));
```

- [ ] **Step 2: Run RED**

Run:

```bash
docker compose -f docker-compose.test.yml up -d mysql-test
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm db:test:migrate
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm --filter @novamall/api test:integration -- tests/integration/migration.test.ts
```

Expected: FAIL because the Stage 4 objects are absent.

- [ ] **Step 3: Add migration**

Create `202606270001_database_core.sql` from the exact table definitions in `docs/phases/04-database-core.md`:

- `addresses`
- `cart_items`
- `master_orders`
- `shop_orders`
- `order_items`
- `payments`

Then add these database objects with concrete SQL bodies:

- `trg_master_orders_audit`
- `trg_shop_orders_audit`
- `trg_user_roles_audit`
- `v_member_order_details`
- `v_effective_product_sales`
- `v_shop_sales_summary`
- `sp_checkout_cart`

The down migration must drop in this order:

```sql
DROP PROCEDURE IF EXISTS sp_checkout_cart;
DROP VIEW IF EXISTS v_shop_sales_summary;
DROP VIEW IF EXISTS v_effective_product_sales;
DROP VIEW IF EXISTS v_member_order_details;
DROP TRIGGER IF EXISTS trg_user_roles_audit;
DROP TRIGGER IF EXISTS trg_shop_orders_audit;
DROP TRIGGER IF EXISTS trg_master_orders_audit;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS shop_orders;
DROP TABLE IF EXISTS master_orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS addresses;
```

Keep all amount columns as `DECIMAL`; do not use floating point.

- [ ] **Step 4: Run GREEN**

Run the commands from Step 2 again.

Expected: migration and migration tests pass.

## Task 3: Stored Procedure Behavior Tests

**Files:**
- Create: `apps/api/tests/integration/checkout-api.test.ts`
- Modify: `database/migrations/202606270001_database_core.sql`

- [ ] **Step 1: Write failing stored procedure tests**

In `checkout-api.test.ts`, prepare real users, shops, categories, products, address and cart rows. Add tests for:

```ts
it("跨店结算创建一个总订单和两个子订单并扣减库存", async () => {
  // 调用 POST /api/v1/member/checkout，断言返回 orderNo。
  // 查询 master_orders、shop_orders、order_items、payments 和 cart_items。
});

it("库存不足时存储过程回滚全部写入", async () => {
  // 把一个商品库存设为 0，结算返回 OUT_OF_STOCK。
  // 断言订单、支付未创建，购物车仍存在，库存未变为负数。
});

it("相同 checkoutToken 重试返回同一订单号", async () => {
  // 同一会员同一 token 调用两次 checkout。
  // 断言 orderNo 相同，order_items 数量不翻倍。
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm --filter @novamall/api test:integration -- tests/integration/checkout-api.test.ts
```

Expected: FAIL because the checkout API and procedure mapping are not implemented.

- [ ] **Step 3: Complete procedure implementation**

Implement the full `sp_checkout_cart` body from the phase spec:

- check idempotency before starting a new order;
- verify address ownership;
- signal `EMPTY_CART`, `ADDRESS_NOT_OWNED`, `PRODUCT_UNAVAILABLE`, `OUT_OF_STOCK`;
- lock products in `product_id` order with `FOR UPDATE`;
- insert `master_orders`, `shop_orders`, `order_items`, `payments`;
- update `products.stock = stock - quantity, version = version + 1`;
- delete checked out cart rows.

- [ ] **Step 4: Run GREEN**

Run the checkout integration test command again.

Expected: the three stored procedure behavior tests pass.

## Task 4: Checkout API Module

**Files:**
- Create: `apps/api/src/modules/checkout/checkout.repository.ts`
- Create: `apps/api/src/modules/checkout/checkout.service.ts`
- Create: `apps/api/src/modules/checkout/checkout.controller.ts`
- Create: `apps/api/src/modules/checkout/checkout.routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/tests/integration/checkout-api.test.ts`

- [ ] **Step 1: Add failing API tests**

Extend `checkout-api.test.ts` to cover:

```ts
it("会员只能管理自己的地址和购物车", async () => {});
it("会员可模拟支付待支付订单且重复支付不重复记账", async () => {});
it("会员可取消待支付订单并恢复库存", async () => {});
it("店主只能查看本店子订单", async () => {});
it("管理员可只读查询审计日志和 Top 10", async () => {});
```

- [ ] **Step 2: Run RED**

Run the same integration test command.

Expected: FAIL because the new route handlers are absent.

- [ ] **Step 3: Implement repository**

Create `CheckoutRepository` methods:

- `createAddress(userId, input)`;
- `listAddresses(userId)`;
- `getCart(userId)`;
- `addCartItem(userId, input)`;
- `updateCartItem(userId, itemId, input)`;
- `deleteCartItem(userId, itemId)`;
- `checkout(userId, input)`;
- `payOrder(userId, orderNo, requestId)`;
- `cancelOrder(userId, orderNo, requestId)`;
- `listMemberOrders(userId)`;
- `listOwnerShopOrders(ownerUserId)`;
- `listAuditLogs(query)`;
- `listTopProducts()`.

Repository must set and clear audit context on transaction connections before status updates.

- [ ] **Step 4: Implement service, controller and routes**

Routes:

```ts
router.get("/member/addresses", requireAuth(authRepository), requireRole("MEMBER"), controller.listAddresses);
router.post("/member/addresses", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.createAddress);
router.get("/member/cart", requireAuth(authRepository), requireRole("MEMBER"), controller.getCart);
router.post("/member/cart/items", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.addCartItem);
router.patch("/member/cart/items/:itemId", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.updateCartItem);
router.delete("/member/cart/items/:itemId", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.deleteCartItem);
router.post("/member/checkout", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.checkout);
router.get("/member/orders", requireAuth(authRepository), requireRole("MEMBER"), controller.listMemberOrders);
router.post("/member/orders/:orderNo/pay", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.payOrder);
router.post("/member/orders/:orderNo/cancel", requireAuth(authRepository), requireRole("MEMBER"), csrfProtection, controller.cancelOrder);
router.get("/owner/shop-orders", requireAuth(authRepository), requireRole("OWNER"), controller.listOwnerShopOrders);
router.get("/admin/audit-logs", requireAuth(authRepository), requireRole("ADMIN"), controller.listAuditLogs);
router.get("/admin/database/top-products", requireAuth(authRepository), requireRole("ADMIN"), controller.listTopProducts);
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm --filter @novamall/api test:integration -- tests/integration/checkout-api.test.ts
```

Expected: PASS.

## Task 5: Concise Database Evidence Document

**Files:**
- Create: `docs/evidence/database/stage-4-core.md`

- [ ] **Step 1: Create concise evidence**

Create one concise evidence file with this structure:

```markdown
# Stage 4 数据库核心证据

## 环境

- 日期：
- Git 提交：
- MySQL 版本：
- 数据规模：

## 技术覆盖

| 技术 | 落地点 | 证据 |
|---|---|---|

## 关键命令输出

记录测试、信息模式查询和索引执行计划的核心输出。
```

- [ ] **Step 2: Populate evidence from fresh runs**

Run database-focused SQL and tests, then paste concise actual outputs into the single evidence file. Reuse `docs/evidence/database/catalog-search.md` for Stage 3 FULLTEXT raw evidence instead of duplicating it.

- [ ] **Step 3: Check evidence consistency**

Run:

```bash
rg -n "待补|占位|未完成|后续补" docs/evidence/database/stage-4-core.md
```

Expected: no matches.

## Task 6: Stage 4 Verification

**Files:**
- All files touched by Tasks 1-5.

- [ ] **Step 1: Run focused checks**

```bash
CI=true pnpm --filter @novamall/shared test -- tests/checkout.contract.test.ts
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm --filter @novamall/api test:integration -- tests/integration/migration.test.ts tests/integration/checkout-api.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run stage gate**

```bash
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm test:integration
CI=true pnpm build
git diff --check
```

Expected: PASS. If any command fails, fix only Stage 4 related issues and re-run the failed command.

## Self-Review

- Spec coverage: Tasks 1-4 cover shared contracts, database structures, procedure, triggers, views, API and state transitions from `docs/phases/04-database-core.md`; Task 5 covers database evidence; Task 6 covers verification.
- Placeholder scan: The implementation plan uses concrete paths, commands and expected results. The only abbreviated SQL appears in Task 2 as a planning scaffold and is explicitly replaced by the exact phase spec before implementation.
- Type consistency: Contract names in Task 1 match route and repository terms in Task 4.

## Execution Note

Because this repository requires user confirmation after phase documentation, start implementation only after `docs/phases/04-database-core.md` and this plan are reviewed and approved. Git commits, pushes and branch operations require separate explicit authorization.
