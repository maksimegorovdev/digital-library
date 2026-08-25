import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppSidebar } from '@/components/app-sidebar';
import { QuickCreateProvider } from '@/components/quick-create-provider';
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
  title: 'Библиотека Егорова Петра',
  description: 'Каталог книг библиотеки Егорова Петра',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-sidebar min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <QuickCreateProvider>
            <SidebarProvider
              style={
                {
                  '--header-height': 'calc(var(--spacing) * 12)',
                } as CSSProperties
              }
            >
              <AppSidebar variant="inset" />
              {/*
                A plain div, not the `SidebarInset` primitive (which renders
                `<main>`): every route's own content already renders its own
                `<main>` landmark, and nesting two `<main>` elements is invalid
                HTML (a `main` must have no `main` descendants). The classes
                below replicate SidebarInset's own "floating panel" look for
                variant="inset" (see ui/sidebar.tsx) so the header and page
                content share one continuous elevated surface instead of the
                header sitting flush against the page background. Its own
                background is `bg-background` (true black/white per theme,
                same as dashboard-01's content pane), not `bg-card` — the
                sidebar-toned body behind it is what provides the contrast.
              */}
              <div className="bg-background ring-foreground/10 relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2">
                <SiteHeader />
                {children}
                <Toaster />
              </div>
            </SidebarProvider>
          </QuickCreateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
