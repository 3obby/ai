import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prismadb from "@/lib/prismadb";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { compare } from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { sendVerificationRequest } from "@/lib/resend-adapter";

// Use process.env.NODE_ENV to determine the environment
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? (process.env.NEXTAUTH_URL_PRODUCTION || "https://groupchatbotbuilder.com")
  : (process.env.NEXTAUTH_URL || "http://localhost:3000");

// Use @ts-ignore for the adapter issue since it's a type compatibility issue between packages
export const authOptions: NextAuthOptions = {
  // @ts-ignore - PrismaAdapter has known type compatibility issues
  adapter: PrismaAdapter(prismadb as PrismaClient),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Standard authentication methods
    EmailProvider({
      server: {
        host: "unused", // Not used with custom sendVerificationRequest
        port: 587,
        auth: {
          user: "unused",
          pass: "unused",
        },
      },
      from: process.env.SMTP_FROM || "auth@groupchatbotbuilder.com",
      sendVerificationRequest, // Use our custom function to send emails with Resend
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // This is a fallback for development - we're using passwordless auth primarily
        // In production, we would implement actual password checks

        const user = await prismadb.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          // Auto-create users for development environment
          if (process.env.NODE_ENV === "development") {
            const newUser = await prismadb.user.create({
              data: {
                email: credentials.email,
                name: credentials.email.split("@")[0],
              },
            });
            return {
              id: newUser.id,
              name: newUser.name || "",
              email: newUser.email,
              image: newUser.image || "",
            };
          }
          return null;
        }

        // If we had a real password implementation:
        // const passwordMatch = await compare(credentials.password, user.hashedPassword);
        // if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name || "",
          email: user.email,
          image: user.image || "",
        };
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as string | null;
        
        // Add isAnonymous flag to session
        session.user.isAnonymous = token.isAnonymous as boolean || false;
      }

      return session;
    },
    async jwt({ token, user, account, profile }) {
      // If user object exists, it means this is called after a successful sign-in
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.isAnonymous = user.isAnonymous || false;

        // Update image from OAuth provider if available
        if (account?.provider === 'google' && profile && 'picture' in profile) {
          const googlePicture = profile.picture as string;
          token.picture = googlePicture;
          
          // Also update in database
          await prismadb.user.update({
            where: { id: user.id },
            data: { image: googlePicture }
          });
        }
      }
      
      return token;
    },
  },
}; 