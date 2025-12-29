import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div
      className={`${geistSans.className} ${geistMono.className} flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black`}
    >
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-5xl font-bold text-zinc-900 dark:text-white sm:text-6xl">
          Welcome to <span className="text-blue-600">ChatApp</span>
        </h1>
        <p className="mt-4 text-2xl text-zinc-700 dark:text-zinc-300 sm:text-3xl">
          Your ultimate chat solution powered by Next.js and NestJS.
        </p>
        <div className="mt-10 flex w-full max-w-md space-x-4">
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center rounded-lg border border-zinc-200 bg-white p-6 text-center hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              Next.js Docs &rarr;
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Learn more about Next.js features and API.
            </p>
          </a>
          <a
            href="https://nestjs.com/docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center rounded-lg border border-zinc-200 bg-white p-6 text-center hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              NestJS Docs &rarr;
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Discover how to build scalable server-side applications.
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
