"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Page() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  return (
    <>
      <div>
        {session?.user.name} - {session?.user.email}
      </div>
      <button
        className="bg-blue-400"
        onClick={async () => await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/login"); // redirect to login page
            },
          },
        })}
      >
        Logout
      </button>
    </>
  )
}