"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Snowfall from "react-snowfall";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";
import { motion } from "motion/react";

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
        <div className="relative z-10 flex flex-col items-center mt-8">
          <div className="relative">
            <h2 className="text-[#DAA520] text-3xl font-bold">Christmas Blackjack</h2>
            <Image
              src="/images/santa-hat.svg"
              alt="Santa Hat"
              width={40}
              height={40}
              className="absolute -top-2 -right-3"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Snowfall snowflakeCount={90} />
      </div>
      <div className="relative z-10 flex flex-col items-center mt-8">
        <div className="relative">
          <h2 className="text-[#DAA520] text-3xl font-bold">Christmas Blackjack</h2>
          <Image
            src="/images/santa-hat.svg"
            alt="Santa Hat"
            width={40}
            height={40}
            className="absolute -top-2 -right-3"
          />
        </div>
      </div>
      <div className="relative z-10 text-white italic font-semibold">
        {nickname ? `Want to play a round, ${nickname}?` : "Want to play a round?"}
      </div>
      <motion.button
        className="relative z-10 text-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
        onClick={() => {
          router.push("/game");
        }}
        whileHover={{ scale: 1.05, backgroundColor: "#c99a1f" }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        START GAME
      </motion.button>
      {isSignedIn ? (
        <>
          <motion.button
            className="relative z-10 text-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
            onClick={() => {
              router.push("/product");
            }}
            whileHover={{ scale: 1.05, backgroundColor: "#c99a1f" }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            TOP-UP CHIPS
          </motion.button>
        </>
      ) : (
        <motion.div
          className="relative z-10 flex justify-between items-center py-2 px-4 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
          onClick={async () => {
            await authClient.signIn.social({
              provider: "google",
              callbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
            })
          }}
          whileHover={{ scale: 1.05, backgroundColor: "#c99a1f" }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          LOGIN
          <Image
            alt="Google"
            src="/google.svg"
            width={25}
            height={25}
          />
        </motion.div>
      )}
    </div>
  )
}