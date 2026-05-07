import { ClerkProvider } from '@clerk/nextjs';
import { esMX } from '@clerk/localizations';
import { AuthenticatedChrome } from '@/components/authenticated-chrome';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';

const ptSans = PT_Sans({ 
  subsets: ['latin'], 
  weight: ['400', '700'],
  variable: '--font-sans' 
});

export const metadata: Metadata = {
  title: 'ICIAR',
  description: 'Un resumen de las actividades y estadísticas clave de la iglesia.',
  applicationName: 'ICIAR',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  appleWebApp: {
    capable: true,
    title: 'ICIAR',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <body
        suppressHydrationWarning
        className={cn(
          'min-h-dvh bg-background font-sans antialiased',
          'pb-[env(safe-area-inset-bottom,0px)]',
          ptSans.variable
        )}
      >
        <ClerkProvider localization={esMX} afterSignOutUrl="/">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthenticatedChrome>{children}</AuthenticatedChrome>
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
