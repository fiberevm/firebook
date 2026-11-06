// serializes models for api responses
import type { ApiKey, Entry, Organization, OrganizationUser, User } from "@accounting/db";
import TagsService from "../../../services/tags";
import type UsersService from "../../../services/users";

export function serializeApiKey(key: ApiKey) {
  return {
    id: key.id,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    key: key.key,
    active: key.active,
    name: key.name,
    createdById: key.createdById,
  };
}

export function serializeOrganization(org: Organization) {
  return {
    id: org.id,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    name: org.name,
    plan: org.plan,
  };
}

export function serializeUser(user: User) {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    id: user.id,
    createdAt: user.createdAt,
  };
}

export async function serializeEntry(entry: Entry) {
  const tagsResult = await new TagsService().getMany(entry.tags ?? []);
  if (tagsResult.isErr()) {
    throw new Error(tagsResult.unwrapErr());
  }

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    valueAtDate: entry.valueAtDate,
    amount: entry.amount,
    currency: entry.currency,
    category: entry.category,
    tags: tagsResult.unwrap().map((tag) => `${tag.key}:${tag.value}`),
    metadata: entry.metadata ?? {},
    dateOfEntry: entry.dateOfEntry,
    type: entry.type,
  };
}

export async function serializeOrganizationUser(member: OrganizationUser, userService: UsersService) {
  const userResult = await userService.get(member.userId!);
  if (userResult.isErr()) {
    throw new Error(userResult.unwrapErr());
  }

  return {
    id: member.id,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    role: member.role,
    user: serializeUser(userResult.unwrap()),
  };
}
