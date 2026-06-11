"use server";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  // If no password is set in the environment, we reject to be safe.
  if (!process.env.ADMIN_PASSWORD) {
    return false;
  }
  return password === process.env.ADMIN_PASSWORD;
}
