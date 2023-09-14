import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Github Repositories Viewer",
  description: "A simple app to view your Github repositories",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <footer className="text-gray-700 font-light text-center max-w-lg mx-auto">
          <a
            className="flex items-center justify-center space-x-2 w-full pt-10"
            href="https://bootpackdigital.com/?utm_source=github-repository-viewer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Bootpack Digital"
              loading="lazy"
              width="300"
              height="90"
              src="https://bootpackdigital.com/bpd-color-horizontal.svg"
            />
          </a>
          <p className="block mt-4">
            Come check out our custom web design, web development, software, and
            mobile apps at{" "}
            <a
              className="text-blue-600 underline"
              href="https://bootpackdigital.com/?utm_source=github-repository-viewer"
            >
              Bootpack Digital
            </a>
          </p>
          <p className="block mt-2">
            <span className="text-sm">©</span>2023 Bootpack Digital
          </p>
        </footer>
      </body>
    </html>
  );
}
