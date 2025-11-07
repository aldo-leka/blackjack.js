"use client";

import { useRouter } from "next/navigation";
import Snowfall from "react-snowfall";

export default function Page() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
      <Snowfall />
      <h2 className="text-[#DAA520] text-3xl font-bold m-4">Blackjack</h2>
      <div className="text-white italic font-semibold">
        Want to play a round?
      </div>
      <div
        className="text-center p-2 text-[#016F32] font-semibold bg-[#DAA520] w-1/2 rounded-sm cursor-pointer"
        onClick={() => {
          router.push("/blackjack");
        }}
      >
        START GAME
      </div>
    </div>
  )
}