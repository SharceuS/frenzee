import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SseProvider } from "@/lib/sse";

export const metadata: Metadata = {
    title: "Frenzee 🎉",
    description: "The ultimate mobile party game — 26 games, infinite fun!",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#080414",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="bg-party-bg min-h-screen font-nunito antialiased overflow-x-hidden">
                {/* Animated background blobs */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="blob blob-purple" />
                    <div className="blob blob-pink" />
                    <div className="blob blob-blue" />
                </div>
                <SseProvider>{children}</SseProvider>
            </body>
        </html>
    );
}
