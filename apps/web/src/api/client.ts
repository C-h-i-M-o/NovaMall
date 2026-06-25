import {
  adminMerchantApplicationSchema,
  authSessionDataSchema,
  categoryInputSchema,
  categorySchema,
  categoryUpdateSchema,
  loginInputSchema,
  merchantApplicationInputSchema,
  merchantApplicationRejectInputSchema,
  merchantApplicationSchema,
  paginatedCategoriesSchema,
  paginatedMerchantApplicationsSchema,
  paginatedProductsSchema,
  priceHistoryEntrySchema,
  productInputSchema,
  productSchema,
  registerInputSchema,
  shopSummarySchema,
  successResponseSchema,
  type AdminMerchantApplication,
  type AuthSessionData,
  type Category,
  type CategoryInput,
  type CategoryUpdate,
  type LoginInput,
  type MerchantApplication,
  type MerchantApplicationInput,
  type MerchantApplicationRejectInput,
  type PaginatedCategories,
  type PaginatedMerchantApplications,
  type PaginatedProducts,
  type PriceHistoryEntry,
  type Product,
  type ProductInput,
  type RegisterInput,
  type ShopSummary
} from "@novamall/shared";
import { z } from "zod";

const API_PREFIX = "/api/v1";

export class ApiClientError extends Error {
  constructor(readonly code: string, message: string, readonly requestId?: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function fetchCsrf(): Promise<string> {
  const response = await request("/auth/csrf", { method: "GET" });
  const parsed = successResponseSchema(authSessionDataSchema.pick({ csrfToken: true })).parse(response);
  return parsed.data.csrfToken;
}

export async function register(input: RegisterInput, csrfToken: string): Promise<AuthSessionData> {
  return writeAuth("/auth/register", registerInputSchema.parse(input), csrfToken);
}

export async function login(input: LoginInput, csrfToken: string): Promise<AuthSessionData> {
  return writeAuth("/auth/login", loginInputSchema.parse(input), csrfToken);
}

export async function getCurrentSession(): Promise<AuthSessionData> {
  const response = await request("/auth/session", { method: "GET" });
  return successResponseSchema(authSessionDataSchema).parse(response).data;
}

export async function getMyMerchantApplication(): Promise<MerchantApplication | null> {
  const response = await request("/merchant-applications/me", { method: "GET" });
  return successResponseSchema(merchantApplicationSchema.nullable()).parse(response).data;
}

export async function submitMerchantApplication(
  input: MerchantApplicationInput,
  csrfToken: string
): Promise<MerchantApplication> {
  const response = await writeJson(
    "/merchant-applications/me",
    "PUT",
    merchantApplicationInputSchema.parse(input),
    csrfToken
  );
  return successResponseSchema(merchantApplicationSchema).parse(response).data;
}

export async function listMerchantApplications(status?: AdminMerchantApplication["status"]): Promise<PaginatedMerchantApplications> {
  const params = new URLSearchParams();
  if (status !== undefined) {
    params.set("status", status);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const response = await request(`/admin/merchant-applications${suffix}`, { method: "GET" });
  const parsed = successResponseSchema(z.array(adminMerchantApplicationSchema))
    .extend({ meta: paginatedMerchantApplicationsSchema.shape.meta })
    .parse(response);
  return {
    data: parsed.data,
    meta: parsed.meta
  };
}

export async function approveMerchantApplication(id: string, csrfToken: string): Promise<{
  application: Pick<MerchantApplication, "id" | "status">;
  shop: ShopSummary;
}> {
  const response = await writeJson(`/admin/merchant-applications/${id}/approve`, "POST", {}, csrfToken);
  return successResponseSchema(z.object({
    application: merchantApplicationSchema.pick({ id: true, status: true }),
    shop: shopSummarySchema
  })).parse(response).data;
}

export async function rejectMerchantApplication(
  id: string,
  input: MerchantApplicationRejectInput,
  csrfToken: string
): Promise<MerchantApplication> {
  const response = await writeJson(
    `/admin/merchant-applications/${id}/reject`,
    "POST",
    merchantApplicationRejectInputSchema.parse(input),
    csrfToken
  );
  return successResponseSchema(merchantApplicationSchema).parse(response).data;
}

export async function getOwnerShop(): Promise<ShopSummary> {
  const response = await request("/owner/shop", { method: "GET" });
  return successResponseSchema(shopSummarySchema).parse(response).data;
}

// ---- Catalog: Categories ----

export async function getPublicCategories(): Promise<Category[]> {
  const response = await request("/categories", { method: "GET" });
  return successResponseSchema(z.array(categorySchema)).parse(response).data;
}

export async function getAdminCategories(): Promise<PaginatedCategories> {
  const response = await request("/admin/categories", { method: "GET" });
  const parsed = successResponseSchema(z.array(categorySchema))
    .extend({ meta: paginatedCategoriesSchema.shape.meta })
    .parse(response);
  return {
    data: parsed.data,
    meta: parsed.meta
  };
}

export async function createCategory(input: CategoryInput, csrfToken: string): Promise<Category> {
  const response = await writeJson(
    "/admin/categories",
    "POST",
    categoryInputSchema.parse(input),
    csrfToken
  );
  return successResponseSchema(categorySchema).parse(response).data;
}

export async function updateCategory(id: string, input: CategoryUpdate, csrfToken: string): Promise<Category> {
  const response = await writeJson(
    `/admin/categories/${id}`,
    "PATCH",
    categoryUpdateSchema.parse(input),
    csrfToken
  );
  return successResponseSchema(categorySchema).parse(response).data;
}

export async function disableCategory(id: string, csrfToken: string): Promise<Category> {
  const response = await writeJson(`/admin/categories/${id}/disable`, "POST", {}, csrfToken);
  return successResponseSchema(categorySchema).parse(response).data;
}

export async function enableCategory(id: string, csrfToken: string): Promise<Category> {
  const response = await writeJson(`/admin/categories/${id}/enable`, "POST", {}, csrfToken);
  return successResponseSchema(categorySchema).parse(response).data;
}

// ---- Catalog: Products (Public) ----

interface ProductListParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  categoryId?: string | undefined;
  keyword?: string | undefined;
  sort?: "newest" | "priceAsc" | "priceDesc" | "relevance" | undefined;
}

export async function getPublicProducts(params: ProductListParams = {}): Promise<PaginatedProducts> {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.pageSize !== undefined) search.set("pageSize", String(params.pageSize));
  if (params.categoryId !== undefined) search.set("categoryId", params.categoryId);
  if (params.keyword !== undefined) search.set("keyword", params.keyword);
  if (params.sort !== undefined) search.set("sort", params.sort);

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  const response = await request(`/products${suffix}`, { method: "GET" });
  const parsed = successResponseSchema(z.array(productSchema))
    .extend({ meta: paginatedProductsSchema.shape.meta })
    .parse(response);
  return {
    data: parsed.data,
    meta: parsed.meta
  };
}

export async function getProduct(id: string): Promise<Product> {
  const response = await request(`/products/${id}`, { method: "GET" });
  return successResponseSchema(productSchema).parse(response).data;
}

// ---- Catalog: Products (Owner) ----

export async function getOwnerProducts(status?: Product["status"]): Promise<PaginatedProducts> {
  const params = new URLSearchParams();
  if (status !== undefined) params.set("status", status);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const response = await request(`/owner/products${suffix}`, { method: "GET" });
  const parsed = successResponseSchema(z.array(productSchema))
    .extend({ meta: paginatedProductsSchema.shape.meta })
    .parse(response);
  return {
    data: parsed.data,
    meta: parsed.meta
  };
}

export async function createProduct(input: ProductInput, csrfToken: string): Promise<Product> {
  const response = await writeJson(
    "/owner/products",
    "POST",
    productInputSchema.parse(input),
    csrfToken
  );
  return successResponseSchema(productSchema).parse(response).data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>, csrfToken: string): Promise<Product> {
  const response = await writeJson(`/owner/products/${id}`, "PATCH", input, csrfToken);
  return successResponseSchema(productSchema).parse(response).data;
}

export async function getOwnerProduct(id: string): Promise<Product> {
  const response = await request(`/owner/products/${id}`, { method: "GET" });
  return successResponseSchema(productSchema).parse(response).data;
}

export async function updateStock(id: string, stock: number, csrfToken: string): Promise<Product> {
  const response = await writeJson(`/owner/products/${id}/stock`, "PATCH", { stock }, csrfToken);
  return successResponseSchema(productSchema).parse(response).data;
}

export async function publishProduct(id: string, csrfToken: string): Promise<Product> {
  const response = await writeJson(`/owner/products/${id}/publish`, "POST", {}, csrfToken);
  return successResponseSchema(productSchema).parse(response).data;
}

export async function unpublishProduct(id: string, csrfToken: string): Promise<Product> {
  const response = await writeJson(`/owner/products/${id}/unpublish`, "POST", {}, csrfToken);
  return successResponseSchema(productSchema).parse(response).data;
}

export async function archiveProduct(id: string, csrfToken: string): Promise<Product> {
  const response = await writeJson(`/owner/products/${id}/archive`, "POST", {}, csrfToken);
  return successResponseSchema(productSchema).parse(response).data;
}

export async function getPriceHistory(id: string): Promise<PriceHistoryEntry[]> {
  const response = await request(`/owner/products/${id}/price-history`, { method: "GET" });
  return successResponseSchema(z.array(priceHistoryEntrySchema)).parse(response).data;
}

// ---- Upload ----

export async function uploadProductImage(file: File, csrfToken: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await requestFormData("/uploads/products", "POST", formData, csrfToken);
  return successResponseSchema(z.object({ path: z.string() })).parse(response).data.path;
}

// ---- Private helpers ----

async function writeAuth(path: string, body: RegisterInput | LoginInput, csrfToken: string): Promise<AuthSessionData> {
  const response = await writeJson(path, "POST", body, csrfToken);
  return successResponseSchema(authSessionDataSchema).parse(response).data;
}

async function writeJson(path: string, method: "POST" | "PUT" | "PATCH", body: object, csrfToken: string): Promise<unknown> {
  return request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    body: JSON.stringify(body)
  });
}

async function requestFormData(path: string, method: "POST", body: FormData, csrfToken: string): Promise<unknown> {
  return request(path, {
    method,
    headers: {
      "X-CSRF-Token": csrfToken
    },
    body
  });
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: "include",
    ...init
  });
  const body = await response.json() as unknown;
  if (!response.ok) {
    throw parseApiError(body);
  }
  return body;
}

function parseApiError(body: unknown): ApiClientError {
  if (
    typeof body === "object"
    && body !== null
    && "error" in body
    && typeof body.error === "object"
    && body.error !== null
    && "code" in body.error
    && "message" in body.error
  ) {
    const code = typeof body.error.code === "string" ? body.error.code : "INTERNAL_ERROR";
    const message = typeof body.error.message === "string" ? body.error.message : "请求失败";
    const requestId = "requestId" in body.error && typeof body.error.requestId === "string"
      ? body.error.requestId
      : undefined;
    return new ApiClientError(code, message, requestId);
  }
  return new ApiClientError("INTERNAL_ERROR", "请求失败");
}
