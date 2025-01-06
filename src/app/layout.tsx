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
        <footer className="pb-12 mx-auto max-w-lg font-light text-center text-gray-700">
          <a
            className="flex justify-center items-center pt-10 space-x-2 w-full"
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
          <p className="block mt-2 text-sm">
            <span className="text-xs">&copy;</span>
            2023-{new Date().getFullYear()} Bootpack Digital, LLC
          </p>
        </footer>
      </body>
    </html>
  );
}
