import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster"
import { ClientLayout } from "@/components/client-layout"
import { auth } from "@/lib/auth"
import { ThemeProvider } from "@/components/theme-provider"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from "@/components/auth-provider";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "LMS Innform",
  description: "Corporate E-learning Platform",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const session = await auth()
  const messages = await getMessages();
  const { locale } = await params;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
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
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
