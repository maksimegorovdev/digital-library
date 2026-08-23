import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider } from '@/components/ui/sidebar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'digital-library',
  description: 'digital-library book catalog',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <SidebarProvider
            style={
              {
                '--header-height': 'calc(var(--spacing) * 12)',
              } as CSSProperties
            }
          >
            <AppSidebar />
            {/*
              A plain div, not the `SidebarInset` primitive (which renders
              `<main>`): every route's own content already renders its own
              `<main>` landmark, and nesting two `<main>` elements is invalid
              HTML (a `main` must have no `main` descendants).
            */}
            <div className="bg-background relative flex w-full flex-1 flex-col">
              <SiteHeader />
              {children}
              <Toaster />
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
