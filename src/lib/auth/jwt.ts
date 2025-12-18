import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;
  role: "CLIENT" | "BUSINESS";
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { algorithm: "HS256", expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  const payload = decoded as jwt.JwtPayload;
  if (!payload?.userId || !payload?.role) throw new Error("Invalid token payload");
  return {
    userId: String(payload.userId),
    role: payload.role === "BUSINESS" ? "BUSINESS" : "CLIENT"
  };
}
