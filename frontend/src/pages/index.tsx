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

  return null;
}
