"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

type SessionProviderProps = {
  children: ReactNode;
};

export default function NextAuthProvider({ children }: SessionProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
} 