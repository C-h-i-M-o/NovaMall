import { Router } from "express";

import { requireAuth, requireRole } from "../../middleware/auth.js";
import { csrfProtection } from "../../middleware/csrf.js";
import type { AuthRepository } from "../auth/auth.repository.js";
import { ProductsController } from "./products.controller.js";
import type { ProductsRepository } from "./products.repository.js";
import { ProductsService } from "./products.service.js";

export function createProductsRouter(
  authRepository: AuthRepository,
  productsRepository: ProductsRepository
): Router {
  const router = Router();
  const controller = new ProductsController(
    new ProductsService(productsRepository)
  );

  // Public routes
  router.get("/products", controller.listProducts);
  router.get("/products/:productId", controller.getProduct);

  // Owner routes
  router.get(
    "/owner/products",
    requireAuth(authRepository),
    requireRole("OWNER"),
    controller.listForOwner
  );
  router.post(
    "/owner/products",
    requireAuth(authRepository),
    requireRole("OWNER"),
    csrfProtection,
    controller.create
  );
  router.get(
    "/owner/products/:productId",
    requireAuth(authRepository),
    requireRole("OWNER"),
    controller.getOwnerProduct
  );
  router.patch(
    "/owner/products/:productId",
    requireAuth(authRepository),
    requireRole("OWNER"),
    csrfProtection,
    controller.update
  );
  router.patch(
    "/owner/products/:productId/stock",
    requireAuth(authRepository),
    requireRole("OWNER"),
    csrfProtection,
    controller.updateStock
  );
  router.post(
    "/owner/products/:productId/publish",
    requireAuth(authRepository),
    requireRole("OWNER"),
    csrfProtection,
    controller.publish
  );
  router.post(
    "/owner/products/:productId/unpublish",
    requireAuth(authRepository),
    requireRole("OWNER"),
    csrfProtection,
    controller.unpublish
  );
  router.post(
    "/owner/products/:productId/archive",
    requireAuth(authRepository),
    requireRole("OWNER"),
    csrfProtection,
    controller.archive
  );
  router.get(
    "/owner/products/:productId/price-history",
    requireAuth(authRepository),
    requireRole("OWNER"),
    controller.getPriceHistory
  );

  return router;
}
