"use client";

import { authClient } from "@/lib/auth-client";

export default function Page() {
    return (
        <div>
            <button
                onClick={() => authClient.checkout({ slug: "Blackjack-10" })}
                className="bg-amber-200"
            >
                Yessir! ($10)
            </button>
             <button
                onClick={() => authClient.checkout({ slug: "Blackjack-Own" })}
                className="bg-blue-600"
            >
                Yessirsky! (own)
            </button>
        </div>
    );
}