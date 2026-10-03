import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          cafe: true,
        },
      },
    },
  });

  return user;
}

export async function getCurrentCafe() {
  const user = await getCurrentUser();
  if (!user || !user.memberships || user.memberships.length === 0) {
    return null;
  }

  // Use the primary / first workspace membership for current operations
  return user.memberships[0].cafe;
}

export async function requireCurrentCafe() {
  const cafe = await getCurrentCafe();
  if (!cafe) {
    throw new Error("UNAUTHORIZED: Kafe atau workspace aktif tidak ditemukan.");
  }
  return cafe;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Pengguna tidak terautentikasi.");
  }
  return user;
}
