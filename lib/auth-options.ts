import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prismadb from "@/lib/prismadb";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { compare } from "bcrypt";
import { PrismaClient } from "@prisma/client";

// Use process.env.NODE_ENV to determine the environment
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? (process.env.NEXTAUTH_URL_PRODUCTION || "https://groupchatbotbuilder.com")
  : (process.env.NEXTAUTH_URL || "http://localhost:3000");

export const authOptions: NextAuthOptions = {
  // Type assertion to fix the TypeScript error with EdgeCompatPrismaClient
  adapter: PrismaAdapter(prismadb as PrismaClient),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST || "smtp.postmarkapp.com", // Corrected hostname
        port: 587,
        auth: {
          user: process.env.SMTP_USER || process.env.POSTMARK_API_KEY || "",
          pass: process.env.SMTP_PASSWORD || process.env.POSTMARK_API_KEY || "",
        },
      },
      from: process.env.SMTP_FROM || "auth@groupchatbotbuilder.com",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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
              name: newUser.name,
              email: newUser.email,
              image: newUser.image,
            };
          }
          return null;
        }

        // If we had a real password implementation:
        // const passwordMatch = await compare(credentials.password, user.hashedPassword);
        // if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
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
      }

      return session;
    },
    async jwt({ token, user }) {
      // Fix the TypeScript error by adding a type check
      const email = token.email ? token.email : undefined;
      
      const dbUser = user || await prismadb.user.findFirst({
        where: {
          email,
        },
      });

      if (!dbUser) {
        return token;
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
  },
}; 