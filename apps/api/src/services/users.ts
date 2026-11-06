import { eq } from "drizzle-orm";
import { Err, Ok, type Result } from "oxide.ts";
import { db, usersTable, type User } from "@accounting/db";

class UsersService {
  async get(userId: string): Promise<Result<User, string>> {
    try {
      const [user] = await db().select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      return user ? Ok(user) : Err("User not found");
    } catch {
      return Err("User not found");
    }
  }

  async getByEmail(email: string): Promise<Result<User, string>> {
    const [user] = await db().select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    return user ? Ok(user) : Err("User not found");
  }

  // a user without a password, who signs in with single sign-on
  async create({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }): Promise<Result<User, string>> {
    try {
      const [user] = await db().insert(usersTable).values({ email: email.trim().toLowerCase(), firstName, lastName, icon: "", passwordHash: null }).returning();
      return Ok(user!);
    } catch (e) {
      return Err((e as Error).message);
    }
  }
}

export default UsersService;
