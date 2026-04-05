"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const SALT_ROUNDS = 10;

/**
 * Hashes a password using bcrypt.
 * Standard for secure password storage.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies the user credentials and signs them in using Next-Auth.
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Email atau password salah.";
        default:
          return "Terjadi kesalahan sistem.";
      }
    }
    throw error;
  }
}
