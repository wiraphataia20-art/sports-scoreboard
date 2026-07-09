import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Uni Sports Scoreboard",
  description: "ตารางแข่งขันกีฬามหาวิทยาลัย",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
