"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) return <div>Loading...</div>;

  if (!session) {
    return null;
  }

  return (
    <div>
      Welcome {session.user.email}
      <button
        onClick={async () => {
          await authClient.signOut();
          router.push("/login");
        }}
        className="bg-blue-200"
      >
        Logout
      </button>
    </div>
  );
}