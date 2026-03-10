import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PID - Pediatric Inpatient Dashboard",
    description: "Communication tool for pediatric ward",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "보호자 대시보드" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
    themeColor: "#0f172a",
};

import { ToastProvider } from "@/components/ui/Toast";
import { Providers } from "@/components/Providers";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    {children}
                    <ToastProvider />
                </Providers>
            </body>
        </html>
    );
}
