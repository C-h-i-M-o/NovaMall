# Stage 4 数据库核心证据

## 环境

- 日期：2026-06-27
- Git 提交：51cd798，当前工作区包含 Stage 4 未提交改动
- MySQL 版本：8.4.9
- 数据规模：测试用例使用确定性小数据集；集成测试结束后清理业务表，当前 `products=0`、`master_orders=0`、`shop_orders=0`、`order_items=0`、`audit_logs=1`

## 技术覆盖

| 技术 | 落地点 | 证据 |
|---|---|---|
| 存储过程 | `sp_checkout_cart` | `checkout-api.test.ts` 覆盖跨店结算、OUT 订单号、库存不足回滚和 checkoutToken 幂等 |
| 触发器 | `trg_master_orders_audit`、`trg_shop_orders_audit`、`trg_user_roles_audit`，并保留 Stage 2/3 触发器 | 信息模式查询能列出触发器；支付和取消产生订单状态审计 |
| 视图 | `v_member_order_details`、`v_effective_product_sales`、`v_shop_sales_summary` | 信息模式查询能列出视图；Top 10 从 `v_effective_product_sales` 读取 |
| 索引优化 | 商品、会员订单、店铺订单、订单明细、审计日志复合索引 | `EXPLAIN` 命中 `idx_products_category_status_id` 与 `idx_master_orders_buyer_created` |
| 事务与并发控制 | `sp_checkout_cart`、支付事务、取消事务 | 库存不足测试证明订单、支付、库存和购物车回滚；取消测试证明库存恢复 |
| 窗口函数 | `/admin/database/top-products` | 查询使用 `ROW_NUMBER() OVER (ORDER BY sold_quantity DESC, product_id ASC)` |
| 审计日志 | `audit_logs` | 订单状态变化写入 `master_orders` 审计，测试断言管理员可查询 |
| 全文检索 | `products` 的 `FULLTEXT(name, description) WITH PARSER ngram` | Stage 3 原始证据见 `docs/evidence/database/catalog-search.md` |
| AES 加密 | `users`、`addresses`、`master_orders` 手机号密文和 IV | AuthRepository 测试覆盖用户手机号不同 IV；Checkout 测试覆盖地址和订单快照不含手机号明文 |

## 关键命令输出

```bash
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm --filter @novamall/api test:integration -- tests/integration/migration.test.ts
```

```text
Test Files  7 passed (7)
Tests  37 passed (37)
```

```bash
TEST_DATABASE_URL='mysql://novamall:novamall_test_password@127.0.0.1:3308/novamall_test' CI=true pnpm --filter @novamall/api test:integration -- tests/integration/checkout-api.test.ts
```

```text
Test Files  8 passed (8)
Tests  40 passed (40)
```

```sql
SELECT ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_NAME = 'sp_checkout_cart';

SELECT TABLE_NAME
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'v_%'
ORDER BY TABLE_NAME;

SELECT TRIGGER_NAME
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME IN (
    'trg_master_orders_audit',
    'trg_shop_orders_audit',
    'trg_user_roles_audit',
    'trg_products_audit',
    'trg_products_price_history',
    'trg_merchant_applications_status_audit'
  )
ORDER BY TRIGGER_NAME;
```

```text
ROUTINE_NAME
sp_checkout_cart

TABLE_NAME
v_effective_product_sales
v_member_order_details
v_shop_sales_summary

TRIGGER_NAME
trg_master_orders_audit
trg_merchant_applications_status_audit
trg_products_audit
trg_products_price_history
trg_shop_orders_audit
trg_user_roles_audit
```

```sql
EXPLAIN SELECT *
FROM products
WHERE category_id = 1 AND status = 'PUBLISHED'
ORDER BY id
LIMIT 20;

EXPLAIN SELECT *
FROM master_orders
WHERE buyer_user_id = 1
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

```text
products key: idx_products_category_status_id
master_orders key: idx_master_orders_buyer_created
```
