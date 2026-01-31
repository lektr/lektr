import type { Metadata } from "next";
import { Inter, Literata } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lektr - Knowledge Retention Engine",
  description:
    "A self-hosted, local-first knowledge retention engine. Stop forgetting what you read.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${literata.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <Providers>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
          <Navbar />
          <main id="main-content" className="flex-1 pt-[72px]">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
