export function isAdmin(userId: string): boolean {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !!adminId && userId === adminId;
}
