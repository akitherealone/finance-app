"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    };

    check();
  }, [router]);

  return <main style={{ padding: 30 }}>Loading...</main>;
}