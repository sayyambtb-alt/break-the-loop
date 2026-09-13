import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Break The Loop",
  description: "Destroy boredom with real-world micro-missions.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Break The Loop",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFAF4",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available. It was previously locked off to make the app
  // feel native, but that also removes the only way a low-vision user can read
  // a proof photo or a mission card, and it is a WCAG 1.4.4 failure.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#FFFAF4] text-stone-900">
        {children}
      </body>
    </html>
  );
}
