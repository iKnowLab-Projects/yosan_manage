"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const user = getStoredUser();
    if (user && user.role === "admin") router.replace("/patients");
    else router.replace("/login");
  }, [router]);
  return null;
}
