import type { ApiCurrentUser } from "@accounting/shared";
import { createContext, useContext, type ReactNode } from "react";

export type UserContextProps = {
  user: ApiCurrentUser;
};

export const UserContext = createContext<UserContextProps | null>(null);

const UserManager = ({ user, children }: { user: ApiCurrentUser; children: ReactNode }) => {
  return <UserContext value={{ user }}>{children}</UserContext>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserManager>");
  }
  return ctx;
};

export default UserManager;
