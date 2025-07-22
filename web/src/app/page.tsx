"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleConnectGmail = () => {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set(
      "client_id",
      "887173527906-tnii5f68e4vcju33vep5ekaq7no398gr.apps.googleusercontent.com"
    );
    authUrl.searchParams.set(
      "redirect_uri",
      "https://zvhhoepsfpotpuaenrpp.functions.supabase.co/gmail-auth"
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send"
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    // Send Supabase user ID in state
    authUrl.searchParams.set("state", session?.user.id || "");

    window.location.href = authUrl.toString();
  };

  const routeDashbaord = () => {
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      {!session ? (
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-md"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={handleConnectGmail}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-md"
          >
            Connect Gmail
          </button>

          <button
            onClick={routeDashbaord}
            className="px-6 py-3 bg-gray-500 hover:bg-red-400 text-white font-semibold rounded-md"
          >
            Dashboard
          </button>
        </div>
      )}
    </main>
  );
}
