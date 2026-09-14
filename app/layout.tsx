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
  openGraph: {
    title: "Break The Loop",
    description:
      "Random real-world micro-missions across Mumbai. Solo, Duo or Squad — plus hyper-local hidden gems.",
    url: "https://breaktheloopapp.in",
    siteName: "Break The Loop",
    locale: "en_IN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#EA580C",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available on purpose. Locking it (maximumScale: 1 /
  // userScalable: false) is an accessibility failure for anyone who needs to
  // magnify text, and the layout reflows fine when zoomed.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-cream text-ink">{children}</body>
    </html>
  );
}
