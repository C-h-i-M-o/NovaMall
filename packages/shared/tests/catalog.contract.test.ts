import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  categoryUpdateSchema,
  productInputSchema,
  productStatusSchema,
  productUpdateSchema,
  stockUpdateSchema,
  categoryStatusSchema
} from "../src/catalog.contract.js";

describe("商品目录共享合同", () => {
  describe("productStatusSchema", () => {
    it("接受合法状态", () => {
      expect(productStatusSchema.safeParse("DRAFT").success).toBe(true);
      expect(productStatusSchema.safeParse("ON_SALE").success).toBe(true);
      expect(productStatusSchema.safeParse("OFF_SALE").success).toBe(true);
      expect(productStatusSchema.safeParse("ARCHIVED").success).toBe(true);
    });

    it("拒绝非法状态", () => {
      expect(productStatusSchema.safeParse("DELETED").success).toBe(false);
      expect(productStatusSchema.safeParse("").success).toBe(false);
    });
  });

  describe("categoryStatusSchema", () => {
    it("接受合法状态", () => {
      expect(categoryStatusSchema.safeParse("ACTIVE").success).toBe(true);
      expect(categoryStatusSchema.safeParse("DISABLED").success).toBe(true);
    });

    it("拒绝非法状态", () => {
      expect(categoryStatusSchema.safeParse("DELETED").success).toBe(false);
    });
  });

  describe("categoryInputSchema", () => {
    it("接受合法分类输入", () => {
      expect(categoryInputSchema.safeParse({
        name: "新鲜水果",
        description: "各类时令新鲜水果",
        sortOrder: 1
      }).success).toBe(true);
    });

    it("description 可选", () => {
      expect(categoryInputSchema.safeParse({
        name: "测试分类"
      }).success).toBe(true);
    });

    it("拒绝过短名称", () => {
      expect(categoryInputSchema.safeParse({
        name: "A"
      }).success).toBe(false);
    });

    it("拒绝过长名称", () => {
      expect(categoryInputSchema.safeParse({
        name: "A".repeat(101)
      }).success).toBe(false);
    });

    it("拒绝空名称", () => {
      expect(categoryInputSchema.safeParse({
        name: "   "
      }).success).toBe(false);
    });

    it("拒绝多余字段", () => {
      expect(categoryInputSchema.safeParse({
        name: "测试",
        extra: "不应该存在"
      }).success).toBe(false);
    });
  });

  describe("categoryUpdateSchema", () => {
    it("接受部分更新", () => {
      expect(categoryUpdateSchema.safeParse({
        name: "新名称"
      }).success).toBe(true);
    });

    it("接受空对象", () => {
      expect(categoryUpdateSchema.safeParse({}).success).toBe(true);
    });
  });

  describe("productInputSchema", () => {
    const validInput = {
      name: "新鲜草莓500g",
      price: "29.90",
      stock: 100,
      description: "当日采摘新鲜草莓，甜度高，适合直接食用。",
      categoryId: "1",
      imagePath: "/uploads/products/strawberry.jpg"
    };

    it("接受合法商品输入", () => {
      expect(productInputSchema.safeParse(validInput).success).toBe(true);
    });

    it("拒绝非数字价格字符串", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        price: "abc"
      }).success).toBe(false);
    });

    it("拒绝过多小数位的价格", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        price: "29.999"
      }).success).toBe(false);
    });

    it("拒绝负数价格", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        price: "-10.00"
      }).success).toBe(false);
    });

    it("拒绝整数价格", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        price: "30"
      }).success).toBe(true);
    });

    it("拒绝负数库存", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        stock: -1
      }).success).toBe(false);
    });

    it("拒绝过短名称", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        name: "A"
      }).success).toBe(false);
    });

    it("拒绝过长名称", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        name: "A".repeat(201)
      }).success).toBe(false);
    });

    it("拒绝空描述", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        description: ""
      }).success).toBe(false);
    });

    it("拒绝非数字分类 ID", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        categoryId: "abc"
      }).success).toBe(false);
    });

    it("拒绝多余字段", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        extra: "不应该存在"
      }).success).toBe(false);
    });

    it("价格接受 0", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        price: "0.00"
      }).success).toBe(true);
    });

    it("库存接受 0", () => {
      expect(productInputSchema.safeParse({
        ...validInput,
        stock: 0
      }).success).toBe(true);
    });
  });

  describe("productUpdateSchema", () => {
    it("接受部分更新", () => {
      expect(productUpdateSchema.safeParse({
        name: "新商品名称"
      }).success).toBe(true);
    });

    it("接受空对象", () => {
      expect(productUpdateSchema.safeParse({}).success).toBe(true);
    });

    it("拒绝非法字段", () => {
      expect(productUpdateSchema.safeParse({
        price: "-10.00"
      }).success).toBe(false);
    });
  });

  describe("stockUpdateSchema", () => {
    it("接受合法库存值", () => {
      expect(stockUpdateSchema.safeParse({ stock: 100 }).success).toBe(true);
      expect(stockUpdateSchema.safeParse({ stock: 0 }).success).toBe(true);
    });

    it("拒绝负数库存", () => {
      expect(stockUpdateSchema.safeParse({ stock: -1 }).success).toBe(false);
    });

    it("拒绝非整数库存", () => {
      expect(stockUpdateSchema.safeParse({ stock: 10.5 }).success).toBe(false);
    });
  });
});
