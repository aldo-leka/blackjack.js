"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Snowfall from "react-snowfall";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";

export default function Page() {
  const router = useRouter();
  const { nickname } = useNickname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setIsSignedIn(true);
        }
      }
      catch (error) {
        console.error("Error checking auth:", error);
      }
      finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="relative flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Snowfall snowflakeCount={90} />
        </div>
        <h2 className="relative z-10 text-[#DAA520] text-3xl font-bold m-4">Blackjack</h2>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Snowfall snowflakeCount={90} />
      </div>
      <h2 className="relative z-10 text-[#DAA520] text-3xl font-bold m-4">Blackjack</h2>
      <div className="relative z-10 text-white italic font-semibold">
        {nickname ? `Want to play a round, ${nickname}?` : "Want to play a round?"}
      </div>
      <button
        className="relative z-10 text-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
        onClick={() => {
          router.push("/game");
        }}
      >
        START GAME
      </button>
      {isSignedIn ? (
        <>
          <button
            className="relative z-10 text-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
            onClick={() => {
              router.push("/product");
            }}
          >
            TOP-UP CHIPS
          </button>
          <button
            className="relative z-10 text-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
            onClick={async () => {
              await authClient.signOut();
              setIsSignedIn(false);
            }}
          >
            LOGOUT
          </button>
        </>
      ) : (
        <div
          className="relative z-10 flex justify-between items-center py-2 px-4 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
          onClick={async () => {
            await authClient.signIn.social({
              provider: "google",
              callbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
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
      )}
    </div>
  )
}