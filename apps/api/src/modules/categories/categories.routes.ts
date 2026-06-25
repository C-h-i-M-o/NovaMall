import { Router } from "express";

import { requireAuth, requireRole } from "../../middleware/auth.js";
import { csrfProtection } from "../../middleware/csrf.js";
import type { AuthRepository } from "../auth/auth.repository.js";
import { CategoriesController } from "./categories.controller.js";
import type { CategoriesRepository } from "./categories.repository.js";
import { CategoriesService } from "./categories.service.js";

export function createCategoriesRouter(
  authRepository: AuthRepository,
  categoriesRepository: CategoriesRepository
): Router {
  const router = Router();
  const controller = new CategoriesController(
    new CategoriesService(categoriesRepository)
  );

  router.get("/categories", controller.listAll);
  router.get(
    "/admin/categories",
    requireAuth(authRepository),
    requireRole("ADMIN"),
    controller.listForAdmin
  );
  router.post(
    "/admin/categories",
    requireAuth(authRepository),
    requireRole("ADMIN"),
    csrfProtection,
    controller.create
  );
  router.patch(
    "/admin/categories/:id",
    requireAuth(authRepository),
    requireRole("ADMIN"),
    csrfProtection,
    controller.update
  );
  router.post(
    "/admin/categories/:id/disable",
    requireAuth(authRepository),
    requireRole("ADMIN"),
    csrfProtection,
    controller.disable
  );
  router.post(
    "/admin/categories/:id/enable",
    requireAuth(authRepository),
    requireRole("ADMIN"),
    csrfProtection,
    controller.enable
  );

  return router;
}
