import type { Metadata } from "next";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
import TokenSafety from "@/components/TokenSafety";

export const metadata: Metadata = {
  title: "Solvra - Precision Attendance & Marks Tracking",
  description: "Automated attendance system with Geo-fencing, QR-based verification, and Face ID authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-primary-bg">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('token');
                if (t && t.split('.').length !== 3) {
                   localStorage.removeItem('token');
                } else if (t) {
                   var p = t.split('.')[1];
                   try { atob(p); } catch(e) { localStorage.removeItem('token'); }
                }
              } catch(e) { localStorage.removeItem('token'); }
            `
          }}
        />
        <TokenSafety />
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}