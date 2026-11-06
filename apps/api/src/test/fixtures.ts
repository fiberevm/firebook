import type { User } from "@accounting/db";
import AuthService from "../services/auth";
import OrganizationsService from "../services/organizations";

export const createTestOrganization = async (createdById: string) => {
  const result = await new OrganizationsService().create("test", createdById);
  if (result.isErr()) {
    throw new Error(`Could not create test organization: ${result.unwrapErr()}`);
  }
  return result.unwrap();
};

export const createTestUser = async (email = "test@test.com") => {
  const result = await new AuthService().register({
    email,
    password: "test-dj-31hd91h3019hf",
    firstName: "test",
    lastName: "test",
  });
  if (result.isErr()) {
    throw new Error(`Could not create test user: ${result.unwrapErr()}`);
  }
  return result.unwrap();
};

export const createTestJwt = async (user: User) => {
  return new AuthService().getAuthToken(user.id);
};
