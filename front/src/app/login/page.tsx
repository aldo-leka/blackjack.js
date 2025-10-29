"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
            <h2 className="text-[#DAA520] text-3xl font-bold m-4">Blackjack</h2>
            <div className="text-white italic font-semibold">
                Login to cash-in
            </div>
            <div
                className="flex justify-between items-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
                onClick={async () => {
                    await authClient.signIn.social({
                        provider: "google",
                        callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/product`,
                    })
                }}
            >
                LOGIN
                <Image
                    alt="Google"
                    src="/google.svg"
                    width={25}
                    height={25}
                />
            </div>
        </div>
    )
}