import { z } from "zod";

const idStringSchema = z.string().regex(/^\d+$/);
const moneyStringSchema = z.string().regex(/^\d+\.\d{2}$/);
const isoStringSchema = z.string().min(1);
const phoneSchema = z.string().regex(/^1\d{10}$/);
const uploadPathSchema = z.string()
  .regex(/^\/uploads\/products\/\d{4}\/\d{2}\/[^/]+\.(jpg|jpeg|png|webp)$/)
  .nullable();

export const masterOrderStatusSchema = z.enum(["PENDING_PAYMENT", "PAID", "CANCELED", "COMPLETED"]);
export const shopOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PENDING_SHIPMENT",
  "SHIPPED",
  "COMPLETED",
  "CANCELED",
  "REFUNDED"
]);

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
