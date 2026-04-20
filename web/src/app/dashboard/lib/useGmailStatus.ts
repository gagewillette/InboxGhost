"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/supabase";

type GmailStatus = "loading" | "connected" | "disconnected";

export function useGmailStatus(userId: string | null) {
  const [status, setStatus] = useState<GmailStatus>("loading");

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("gmail_tokens")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setStatus(data ? "connected" : "disconnected");
      });
  }, [userId]);

  return status;
}
