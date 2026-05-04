import type { Metadata } from "next";
import { Sidebar } from "../components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "TCG Monitor Admin",
  description: "Admin dashboard for Pokemon TCG and One Piece Card Game product monitoring."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
