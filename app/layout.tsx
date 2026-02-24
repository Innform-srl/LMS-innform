import type { Metadata, Viewport } from "next";
import { Sora, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { ClientLayout } from "@/components/client-layout"
import { auth } from "@/lib/auth"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider";
import { PWARegister } from "@/components/pwa-register";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sora",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "LMS Innform",
  description: "Corporate E-learning Platform",
  manifest: "/lms/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LMS Innform",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()

  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          // Remove browser extension attributes (e.g. Bitdefender bis_skin_checked) before React hydration
          new MutationObserver(function(mutations, observer) {
            document.querySelectorAll('[bis_skin_checked]').forEach(function(el) { el.removeAttribute('bis_skin_checked'); });
          }).observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
        `}} />
      </head>
      <body
        className={`${sora.variable} ${instrumentSerif.variable} ${sora.className} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ClientLayout user={session?.user}>
              {children}
            </ClientLayout>
            <Toaster />
          </ThemeProvider>
          <PWARegister />
        </AuthProvider>
      </body>
    </html>
  );
}
