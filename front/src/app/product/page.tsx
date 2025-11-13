"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Snowfall from "react-snowfall";
import Chip from "@/components/Chip";
import { motion } from "motion/react";
import Image from "next/image";
import { convertToChips } from "@/lib/util";
import Chat from "@/components/Chat";
import { useNickname } from "@/contexts/NicknameContext";

interface PricePackage {
    price: string;
    chips: number;
    bonus: number;
    total: number;
    label: string;
    slug: string;
}

const packages: PricePackage[] = [
    { price: "$0.99", chips: 150, bonus: 0, total: 150, label: "Starter Pack", slug: "Blackjack-Starter" },
    { price: "$2.99", chips: 450, bonus: 50, total: 500, label: "Quick Boost", slug: "Blackjack-Quick-Boost" },
    { price: "$4.99", chips: 750, bonus: 150, total: 900, label: "Value Pack", slug: "Blackjack-Value-Pack" },
    { price: "$9.99", chips: 1500, bonus: 500, total: 2000, label: "Pro Pack", slug: "Blackjack-Pro-Pack" },
    { price: "$19.99", chips: 3500, bonus: 1000, total: 4500, label: "High Roller Pack", slug: "Blackjack-High-Roller-Pack" },
    { price: "$49.99", chips: 10000, bonus: 2500, total: 12500, label: "VIP Pack", slug: "Blackjack-VIP-Pack" },
    { price: "$99.99", chips: 22000, bonus: 6000, total: 28000, label: "Whale Pack", slug: "Blackjack-Whale-Pack" },
];

export default function Page() {
    const router = useRouter();
    const { nickname } = useNickname();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const session = await authClient.getSession();
                if (!session?.data?.user) {
                    router.push("/login");
                } else {
                    setIsSignedIn(true);
                }
            }
            catch (error) {
                console.error("Error checking auth:", error);
                router.push("/login");
            }
            finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return (
            <div className="relative flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <Snowfall snowflakeCount={90} />
                </div>
                <div className="relative z-10 flex flex-col items-center mt-8">
                    <div className="relative cursor-pointer" onClick={() => router.push("/")}>
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

    if (!isSignedIn) {
        return null;
    }

    return (
        <div className="relative flex flex-col items-center gap-6 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen py-8">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <Snowfall snowflakeCount={90} />
            </div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="relative cursor-pointer" onClick={() => router.push("/")}>
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
            <div className="relative z-10 text-white italic font-semibold text-xl">
                Choose your chip package
            </div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-8 max-w-6xl w-full">
                {packages.map((pkg, index) => {
                    const chipBreakdown = convertToChips(pkg.total);
                    return (
                        <motion.button
                            key={pkg.slug}
                            onClick={() => authClient.checkout({ slug: pkg.slug })}
                            className="flex flex-col items-center gap-3 p-6 bg-[#016F32] border-2 border-[#DAA520] rounded-lg cursor-pointer"
                            whileHover={{ scale: 1.03, borderColor: "#FFD700" }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ transitionDelay: `${index * 0.05}s` }}
                        >
                            <div className="text-[#DAA520] text-2xl font-bold">{pkg.price}</div>
                            <div className="text-white font-semibold text-lg">{pkg.label}</div>

                            <div className="flex flex-wrap justify-center gap-1 items-center min-h-[50px]">
                                {chipBreakdown[0] > 0 && (
                                    <div className="flex flex-col items-center">
                                        <Chip color="white" amount={chipBreakdown[0]} size={30} />
                                    </div>
                                )}
                                {chipBreakdown[1] > 0 && (
                                    <div className="flex flex-col items-center">
                                        <Chip color="red" amount={chipBreakdown[1]} size={30} />
                                    </div>
                                )}
                                {chipBreakdown[2] > 0 && (
                                    <div className="flex flex-col items-center">
                                        <Chip color="green" amount={chipBreakdown[2]} size={30} />
                                    </div>
                                )}
                                {chipBreakdown[3] > 0 && (
                                    <div className="flex flex-col items-center">
                                        <Chip color="black" amount={chipBreakdown[3]} size={30} />
                                    </div>
                                )}
                                {chipBreakdown[4] > 0 && (
                                    <div className="flex flex-col items-center">
                                        <Chip color="blue" amount={chipBreakdown[4]} size={30} />
                                    </div>
                                )}
                            </div>

                            <div className="text-white text-sm">
                                {pkg.bonus > 0 ? (
                                    <>
                                        <span className="text-gray-300">{pkg.chips} chips</span>
                                        <span className="text-green-400"> + {pkg.bonus} bonus</span>
                                        <span className="text-[#DAA520] font-bold"> = {pkg.total} total</span>
                                    </>
                                ) : (
                                    <span className="text-[#DAA520] font-bold">{pkg.total} chips</span>
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
            <div className="relative z-10 w-full px-4 mt-8 mb-8">
                <Chat disabled={!nickname} />
            </div>
        </div>
    );
}
