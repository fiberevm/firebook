import { and, eq, inArray } from "drizzle-orm";
import { Err, Ok, type Result } from "oxide.ts";
import { db, organizationsTable, organizationUsersTable, type Organization, type OrganizationRole, type OrganizationUser } from "@accounting/db";

const MAX_MEMBERS = 15;

class OrganizationsService {
  async create(name: string, createdById: string): Promise<Result<Organization, string>> {
    try {
      const org = await db().transaction(async (tx) => {
        const [created] = await tx.insert(organizationsTable).values({ name }).returning();
        // the creator is the first admin
        await tx.insert(organizationUsersTable).values({ organizationId: created!.id, userId: createdById, role: "admin" });
        return created!;
      });
      return Ok(org);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  async addUser(organizationId: string, userId: string, role: OrganizationRole = "member"): Promise<Result<OrganizationUser, string>> {
    try {
      const members = await this.getMembers(organizationId);
      if (members.isErr()) return Err(members.unwrapErr());

      if (members.unwrap().some((m) => m.userId === userId)) {
        return Err("User is already a member of this organization");
      }

      if (members.unwrap().length >= MAX_MEMBERS) {
        return Err(`Cannot add more than ${MAX_MEMBERS} members to organization`);
      }

      const [result] = await db().insert(organizationUsersTable).values({ organizationId, userId, role }).returning();
      return Ok(result!);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  async removeUser(organizationId: string, userId: string): Promise<Result<void, string>> {
    try {
      const members = await this.getMembers(organizationId);
      if (members.isErr()) return Err(members.unwrapErr());

      const list = members.unwrap();
      const target = list.find((m) => m.userId === userId);
      if (!target) {
        return Err("User is not a member of this organization");
      }

      if (list.length <= 1) {
        return Err("Cannot remove last user from organization");
      }

      if (target.role === "admin" && list.filter((m) => m.role === "admin").length <= 1) {
        return Err("Cannot remove the last admin from organization");
      }

      await db()
        .delete(organizationUsersTable)
        .where(and(eq(organizationUsersTable.organizationId, organizationId), eq(organizationUsersTable.userId, userId)));

      return Ok(undefined);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  async getById(id: string): Promise<Result<Organization, string>> {
    try {
      const [result] = await db().select().from(organizationsTable).where(eq(organizationsTable.id, id)).limit(1);
      return result ? Ok(result) : Err("Organization not found");
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  async getAllForUser(userId: string): Promise<Result<Organization[], string>> {
    try {
      const memberships = await db()
        .select({ organizationId: organizationUsersTable.organizationId })
        .from(organizationUsersTable)
        .where(eq(organizationUsersTable.userId, userId));

      const ids = memberships.map((r) => r.organizationId).filter((id): id is string => id !== null);
      if (ids.length === 0) return Ok([]);

      const orgs = await db().select().from(organizationsTable).where(inArray(organizationsTable.id, ids)).orderBy(organizationsTable.createdAt);
      return Ok(orgs);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  // returns the membership if the user has access to the org
  async hasAccess(userId: string, organizationId: string): Promise<Result<OrganizationUser, string>> {
    try {
      const [result] = await db()
        .select()
        .from(organizationUsersTable)
        .where(and(eq(organizationUsersTable.userId, userId), eq(organizationUsersTable.organizationId, organizationId)))
        .limit(1);
      return result ? Ok(result) : Err("User does not have access to organization");
    } catch {
      // e.g. malformed uuid
      return Err("User does not have access to organization");
    }
  }

  async getMembers(organizationId: string): Promise<Result<OrganizationUser[], string>> {
    try {
      const result = await db()
        .select()
        .from(organizationUsersTable)
        .where(eq(organizationUsersTable.organizationId, organizationId))
        .orderBy(organizationUsersTable.createdAt);
      return Ok(result);
    } catch (error) {
      return Err((error as Error).message);
    }
  }
}

export default OrganizationsService;
