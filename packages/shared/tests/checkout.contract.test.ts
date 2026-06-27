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
