"use client";
import { SocketProvider } from "@/lib/socket";
import GameApp from "@/components/GameApp";

export default function Page() {
    return (
        <SocketProvider>
            <GameApp />
        </SocketProvider>
    );
}
