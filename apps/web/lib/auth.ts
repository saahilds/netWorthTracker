import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { prisma } from "./db";
import { env } from "./env";

const providers: any[] = [];

if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET
    })
  );
}

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET
    })
  );
}

if (providers.length === 0 && env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      name: "Local Dev Sign In",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim();
        if (!email) {
          return null;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          return existingUser;
        }

        return prisma.user.create({
          data: {
            email,
            name: email.split("@")[0]
          }
        });
      }
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database"
  },
  providers,
  secret: env.AUTH_SECRET,
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        (session.user as { id?: string }).id = user.id;
      }
      return session;
    }
  }
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
