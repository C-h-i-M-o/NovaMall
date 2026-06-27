import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { AuthController } from "./auth.controller.js";
import type { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";

export function createAuthRouter(repository: AuthRepository): Router {
  const router = Router();
  const controller = new AuthController(new AuthService(repository));

  router.get("/csrf", controller.csrf);
  router.post("/register", csrfProtection, controller.register);
  router.post("/login", csrfProtection, controller.login);
  router.post("/logout", requireAuth(repository), csrfProtection, controller.logout);
  router.get("/session", requireAuth(repository), controller.currentSession);
  router.get("/profile", requireAuth(repository), controller.privateProfile);
  router.patch("/profile", requireAuth(repository), csrfProtection, controller.updatePrivateProfile);

  return router;
}
