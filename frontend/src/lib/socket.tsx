"use client";
import { createContext, useContext, useEffect, useRef, useState, useMemo, ReactNode } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ||
    (typeof window !== "undefined" ? `http://${window.location.hostname}:4000` : "http://localhost:4000");

interface SocketCtx { socket: Socket | null; connected: boolean; }
const Ctx = createContext<SocketCtx>({ socket: null, connected: false });

export function SocketProvider({ children }: Readonly<{ children: ReactNode }>) {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const s = io(BACKEND, { transports: ["websocket"] });
        socketRef.current = s;
        s.on("connect", () => setConnected(true));
        s.on("disconnect", () => setConnected(false));
        return () => { s.disconnect(); };
    }, []);

    const value = useMemo(
        () => ({ socket: socketRef.current, connected }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [connected]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);
