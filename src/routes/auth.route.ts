import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authRateLimit } from "../middleware/rate-limit.js";
import { authenticateToken, requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/refresh", authController.refresh);

router.post("/signup", authRateLimit, authController.signup);

router.post("/login", authRateLimit, authController.login);

router.post("/logout", authController.logout);

router.get("/verify", authenticateToken, authController.verify);

router.get("/me", requireAuth, authController.me);

export default router;
