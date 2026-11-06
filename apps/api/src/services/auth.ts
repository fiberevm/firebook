import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { Err, Ok, type Result } from "oxide.ts";
import { db, usersTable, type User } from "@accounting/db";
import { env } from "../env";

type RegisterInput = { email: string; password: string; firstName: string; lastName: string };

class AuthService {
  async register({ email, password, firstName, lastName }: Partial<RegisterInput>): Promise<Result<User, string>> {
    if (!email || !password || !firstName || !lastName) {
      return Err("All fields are required: email, password, firstName, lastName");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Err("Invalid email format");
    }

    if (password.length < 8) {
      return Err("Password must be at least 8 characters long");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await db().select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (existingUser.length > 0) {
      return Err("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db().insert(usersTable).values({ email: normalizedEmail, passwordHash, firstName, lastName, icon: "" }).returning();

    return Ok(user!);
  }

  // returns the user if the email / password combination is valid
  async verifyCredentials(email: string, password: string): Promise<Result<User, string>> {
    const [user] = await db().select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    // users created through single sign-on have no password
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return Err("Invalid email or password");
    }
    return Ok(user);
  }

  async getAuthToken(userId: string): Promise<string> {
    return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });
  }

  async verifyJwt(token: string): Promise<Result<{ userId: string }, string>> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (typeof decoded === "string" || typeof decoded.userId !== "string") {
        return Err("Invalid token");
      }
      return Ok({ userId: decoded.userId });
    } catch {
      return Err("Invalid token");
    }
  }
}

export default AuthService;
