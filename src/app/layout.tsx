import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import PreloaderWrapper from "@/components/preloader-wrapper";
import { WindowManagerProvider } from "@/components/window-manager";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://chitragar.in'),
  title: "Chitragar.in - Portfolio & Photography",
  description: "Welcome to Chitragar.in - A creative portfolio showcasing photography, design, and digital artistry. Explore stunning visual work and creative projects.",
  keywords: ["photography", "portfolio", "design", "digital art", "creative", "visual arts", "photographer", "chitragar"],
  authors: [{ name: "Chitragar" }],
  creator: "Chitragar",
  publisher: "Chitragar.in",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chitragar.in',
    siteName: 'Chitragar.in',
    title: 'Chitragar.in - Portfolio & Photography',
    description: 'Welcome to Chitragar.in - A creative portfolio showcasing photography, design, and digital artistry. Explore stunning visual work and creative projects.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Chitragar.in - Portfolio & Photography',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chitragar.in - Portfolio & Photography',
    description: 'Welcome to Chitragar.in - A creative portfolio showcasing photography, design, and digital artistry.',
    images: ['/og-image.jpg'],
    creator: '@chitragar',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: 'https://chitragar.in',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GRYFWWKYLE"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GRYFWWKYLE');
          `}
        </Script>
        
        {/* Additional SEO Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon and Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/sign.png" />
        
        {/* Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Chitragar",
              "url": "https://chitragar.in",
              "sameAs": [
                "https://instagram.com/chitragar",
              ],
              "jobTitle": "Photographer & Digital Artist",
              "description": "Creative portfolio showcasing photography, design, and digital artistry",
              "knowsAbout": ["Photography", "Digital Art", "Design", "Visual Arts"],
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://chitragar.in"
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PreloaderWrapper>
          <WindowManagerProvider>
            {children}
            <Toaster 
              position="top-right"
              richColors
              closeButton
              theme="light"
              toastOptions={{
                duration: 4000,
                className: 'sonner-toast',
              }}
            />
          </WindowManagerProvider>
        </PreloaderWrapper>
      </body>
    </html>
  );
}
