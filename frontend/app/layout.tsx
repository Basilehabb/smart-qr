import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// ✅ استبدال Geist بخط Inter
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// ✅ استبدال Geist_Mono بخط Roboto Mono
const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart QR Platform",
  description: "Smart QR digital business card system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
