import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Pocket Party 🎉",
    description: "The ultimate multiplayer party game — Guess the Liar and more!",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#0F0A1E",
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
                {children}
            </body>
        </html>
    );
}
