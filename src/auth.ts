import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.nama,
          email: user.email,
          image: user.foto,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const email = user.email.trim().toLowerCase();
        const googleId = account.providerAccountId;
        const photo = user.image || null;
        const name = user.name || profile?.name || "User";

        // Find or create user + cafe workspace
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: { cafe: true },
            },
          },
        });

        if (!existingUser) {
          // Create User + Cafe + CafeMember in a single atomic transaction
          await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                nama: name,
                email,
                googleId,
                foto: photo,
                isActive: true,
              },
            });

            const newCafe = await tx.cafe.create({
              data: {
                nama: "Cafe Saya",
                telepon: "-",
                alamat: "",
              },
            });

            await tx.cafeMember.create({
              data: {
                userId: newUser.id,
                cafeId: newCafe.id,
                role: "OWNER",
              },
            });
          });
        } else {
          // Existing User: Link Google ID and update photo if not present
          if (!existingUser.googleId || !existingUser.foto) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: existingUser.googleId || googleId,
                foto: existingUser.foto || photo,
              },
            });
          }

          // Ensure User has at least one Cafe membership
          if (!existingUser.memberships || existingUser.memberships.length === 0) {
            await prisma.$transaction(async (tx) => {
              const newCafe = await tx.cafe.create({
                data: {
                  nama: "Cafe Saya",
                  telepon: "-",
                  alamat: "",
                },
              });

              await tx.cafeMember.create({
                data: {
                  userId: existingUser.id,
                  cafeId: newCafe.id,
                  role: "OWNER",
                },
              });
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.email) {
        // Resolve active cafe and user details from DB
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: {
            memberships: {
              include: { cafe: true },
              take: 1,
            },
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.nama;
          token.picture = dbUser.foto;
          if (dbUser.memberships && dbUser.memberships.length > 0) {
            token.cafeId = dbUser.memberships[0].cafeId;
            token.cafeName = dbUser.memberships[0].cafe.nama;
            token.role = dbUser.memberships[0].role;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | null | undefined;
        (session.user as any).cafeId = token.cafeId as string;
        (session.user as any).cafeName = token.cafeName as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
