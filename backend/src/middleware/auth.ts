import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = { id: string; email: string; role: string };

export function signToken(user: AuthUser) {
  const secret = process.env.JWT_SECRET || "dev";
  return jwt.sign(user, secret, { expiresIn: "7d" });
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const secret = process.env.JWT_SECRET || "dev";
    const payload = jwt.verify(header.slice(7), secret) as AuthUser;
    (req as Request & { user: AuthUser }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function getUser(req: Request): AuthUser {
  return (req as Request & { user: AuthUser }).user;
}
