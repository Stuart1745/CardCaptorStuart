import type { User } from "firebase/auth";

// Keep in sync with isAdmin() in firestore.rules.
export const ADMIN_EMAILS = ["rampy1745@gmail.com"];

export const isAdminUser = (user: User | null | undefined): boolean =>
  !!user?.email && ADMIN_EMAILS.includes(user.email);
