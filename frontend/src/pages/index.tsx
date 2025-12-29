import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to login page on initial load
    router.push("/login");
  }, [router]);

  return (
    <>
      <Head>
        <title>Chat App</title>
        <meta name="description" content="Real-time Chat Application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <main className="flex flex-col items-center gap-6 text-center px-4">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
            Chat App
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400 max-w-lg">
            A real-time messaging platform built with Next.js and NestJS.
            Connect with friends instantly.
          </p>
          <div className="mt-6 flex gap-4">
            <Link
              href="/login"
              className="rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Get Started
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
