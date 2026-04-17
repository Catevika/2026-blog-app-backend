// src/routes/auth.route.ts
import { Router } from "express";
import * as authController from "../controllers/authController";
import { createAuthLimiter } from "../middleware/rate-limit";
import { authenticateToken, requireAuth } from "../middleware/requireAuth";

const router = Router();

router.post("/refresh", authController.refresh);

router.post("/signup", createAuthLimiter(), authController.signup);

router.post("/login", createAuthLimiter(), authController.login);

router.post("/logout", authController.logout);

router.get("/verify", authenticateToken, authController.verify);

router.get("/me", requireAuth, authController.me);

export default router;
