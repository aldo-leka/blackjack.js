"use client";

import { authClient } from "@/lib/auth-client";

export default function Page() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;

  if (!session) {
    window.location.href = "/login";
    return null;
  }

  return <div>Welcome {session.user.email}</div>;
}