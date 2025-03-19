import { sendEmail } from "@/lib/email";
import type { Adapter } from "next-auth/adapters";

/**
 * Custom adapter for NextAuth.js to use Resend for sending authentication emails
 * Based on the EmailProvider but using our custom styled emails
 */
export function ResendAdapter(): Adapter {
  return {
    // We're not implementing any database methods here - just the sendVerificationRequest
    // The database methods will be handled by the PrismaAdapter
    async createUser() {
      throw new Error("ResendAdapter.createUser not implemented");
    },
    async getUser() {
      throw new Error("ResendAdapter.getUser not implemented");
    },
    async getUserByEmail() {
      throw new Error("ResendAdapter.getUserByEmail not implemented");
    },
    async getUserByAccount() {
      throw new Error("ResendAdapter.getUserByAccount not implemented");
    },
    async updateUser() {
      throw new Error("ResendAdapter.updateUser not implemented");
    },
    async linkAccount() {
      throw new Error("ResendAdapter.linkAccount not implemented");
    },
    async createSession() {
      throw new Error("ResendAdapter.createSession not implemented");
    },
    async getSessionAndUser() {
      throw new Error("ResendAdapter.getSessionAndUser not implemented");
    },
    async updateSession() {
      throw new Error("ResendAdapter.updateSession not implemented");
    },
    async deleteSession() {
      throw new Error("ResendAdapter.deleteSession not implemented");
    },
    async createVerificationToken() {
      throw new Error("ResendAdapter.createVerificationToken not implemented");
    },
    async useVerificationToken() {
      throw new Error("ResendAdapter.useVerificationToken not implemented");
    },
    async deleteUser() {
      throw new Error("ResendAdapter.deleteUser not implemented");
    },
    async unlinkAccount() {
      throw new Error("ResendAdapter.unlinkAccount not implemented");
    },
  };
}

// Custom function to handle sending the verification email
export async function sendVerificationRequest(params: {
  identifier: string;
  url: string;
  provider: {
    server: string;
    from: string;
  };
}) {
  const { identifier, url, provider } = params;
  const { host } = new URL(url);

  // Simple message with just the login button
  const message = `
    <a href="${url}" class="button">
      Log in
    </a>
    <p class="note">
      For security, this link expires in 24 hours.
    </p>
  `;

  // Send the email using our custom sendEmail function
  const success = await sendEmail({
    to: identifier,
    subject: `Sign in to ${host}`,
    message,
    from: provider.from,
  });

  if (!success) {
    throw new Error("Failed to send verification email");
  }
} 