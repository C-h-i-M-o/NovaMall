# Stage 3 Product Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the product catalog loop where admins manage categories, owners manage products with image upload, and public users browse/search products with FULLTEXT ngram search and price history tracking.

**Architecture:** Follow the existing modular monolith structure. Shared Zod contracts define request/response DTOs, Express routes call controller/service/repository layers, repositories are the only SQL boundary, and React pages call typed API client functions.

**Tech Stack:** TypeScript, pnpm workspace, Express, mysql2, MySQL/dbmate migrations, Zod, React, React Router, Vitest, Supertest, multer.

---

## File Map

- Create `docs/phases/03-catalog.md`: Stage 3 specification.
- Create `database/migrations/202606250001_catalog.sql`: categories, products, product_price_history tables, FULLTEXT index, price history trigger.
- Modify `packages/shared/src/errors.ts`: add CATEGORY_NAME_TAKEN, PRODUCT_NOT_OWNED, PRODUCT_STATUS_CONFLICT, UPLOAD_INVALID.
- Create `packages/shared/src/catalog.contract.ts`: all catalog Zod schemas and types.
- Modify `packages/shared/src/index.ts`: export catalog contracts.
- Create `packages/shared/tests/catalog.contract.test.ts`: shared contract tests.
- Create `apps/api/src/modules/categories/*`: repository, service, controller, routes.
- Create `apps/api/src/modules/products/*`: repository, service, controller, routes.
- Create `apps/api/src/modules/uploads/uploads.routes.ts`: multipart image upload handler.
- Modify `apps/api/src/app.ts`: mount categories, products, and uploads routers.
- Modify `apps/api/src/config/env.ts`: add UPLOAD_DIR.
- Modify `apps/api/src/server.ts`: wire new repositories and uploadDir.
- Modify `apps/api/tests/integration/migration.test.ts`: add Stage 3 table assertions.
- Create `apps/api/tests/integration/categories-api.test.ts`.
- Create `apps/api/tests/integration/products-api.test.ts`.
- Modify `apps/web/src/api/client.ts`: add catalog API functions.
- Modify `apps/web/src/pages/role-page.tsx`: add AdminCategoriesPanel and OwnerProductsPanel.
- Create `apps/web/src/pages/catalog-page.tsx`: public product listing with search/filter.
- Create `apps/web/src/pages/product-detail-page.tsx`: product detail view.
- Modify `apps/web/src/app/app.tsx`: add /catalog and /products/:productId routes.
- Modify `docs/api.md`: add Stage 3 error codes.

---

## Task 1: Synchronize Specs And Shared Contracts

- [x] **Step 1: Create phase spec document** — `docs/phases/03-catalog.md`
- [x] **Step 2: Add Stage 3 error codes** — CATEGORY_NAME_TAKEN, PRODUCT_NOT_OWNED, PRODUCT_STATUS_CONFLICT, UPLOAD_INVALID
- [x] **Step 3: Create catalog contracts** — `packages/shared/src/catalog.contract.ts` with product/category/price history schemas
- [x] **Step 4: Write contract tests** — `packages/shared/tests/catalog.contract.test.ts` (59 total shared tests pass)
- [x] **Step 5: Update API documentation** — Stage 3 error codes in `docs/api.md`

## Task 2: Database Migration

- [x] **Step 1: Create migration** — `database/migrations/202606250001_catalog.sql` with categories, products (FULLTEXT ngram), product_price_history, trigger
- [x] **Step 2: Update migration tests** — `apps/api/tests/integration/migration.test.ts` with Stage 3 table/trigger/constraint assertions
- [ ] **Step 3: Run migration against test database** — requires Docker MySQL test container

## Task 3: Admin Categories API

- [x] **Step 1: Build repository** — `categories.repository.ts` with listAll, listForAdmin, create, update, updateStatus
- [x] **Step 2: Build service** — `categories.service.ts` with Zod validation and duplicate name handling
- [x] **Step 3: Build controller and routes** — `categories.controller.ts`, `categories.routes.ts`
- [x] **Step 4: Mount in app.ts** — public GET /categories, admin CRUD routes

## Task 4: Owner Products & Public Products API

- [x] **Step 1: Build repository** — `products.repository.ts` with public listing (FULLTEXT search, category filter, sort), owner CRUD, stock, status transitions, price history
- [x] **Step 2: Build service** — `products.service.ts` with Zod validation, ownership checks, status machine
- [x] **Step 3: Build controller and routes** — `products.controller.ts`, `products.routes.ts`
- [x] **Step 4: Mount in app.ts** — public GET /products, owner /owner/products/* routes

## Task 5: Image Upload Module

- [x] **Step 1: Build upload handler** — `uploads.routes.ts` with multipart parsing, file type/size validation, UUID naming
- [x] **Step 2: Configure env** — add UPLOAD_DIR to env.ts, static file serving in app.ts
- [x] **Step 3: Update server.ts** — wire new repositories and uploadDir

## Task 6: Frontend API Client

- [x] **Step 1: Add catalog API functions** — categories CRUD, products public/owner, price history, image upload
- [x] **Step 2: Add requestFormData helper** — multipart upload support

## Task 7: Frontend Pages

- [x] **Step 1: Admin Categories Panel** — list, create, edit, enable/disable categories
- [x] **Step 2: Owner Products Panel** — list with status filter, create, stock adjust, publish/unpublish/archive
- [x] **Step 3: Public Catalog Page** — product grid, category sidebar filter, keyword search, sort
- [x] **Step 4: Product Detail Page** — product image, info, shop/category display
- [x] **Step 5: Update Router** — add /catalog and /products/:productId routes

## Task 8: Quality Gates

- [x] **Step 1: Typecheck** — all 3 packages pass
- [x] **Step 2: Lint** — zero errors
- [x] **Step 3: Unit Tests** — 67 passed (59 shared + 8 API)
- [x] **Step 4: Build** — all 3 packages build successfully
- [ ] **Step 5: Integration Tests** — requires Docker MySQL test container
- [ ] **Step 6: E2E Tests** — requires full Docker stack

---

## Self-Review

- Spec coverage: categories CRUD, product CRUD with status machine, image upload, public listing/search, price history via trigger
- Scope check: cart, orders, payments, refunds excluded
- Type consistency: contract names, route names, status names, error codes match `docs/phases/03-catalog.md`
- All code follows existing patterns: Route → Controller → Service → Repository, Zod validation, typed API client
