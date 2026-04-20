"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import LenisProvider from "@/components/LenisProvider";
import RevealSection from "@/components/RevealSection";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import InboxDemo from "@/components/landing/InboxDemo";
import Transparency from "@/components/landing/Transparency";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/dashboard");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <LenisProvider>
      <Hero onSignIn={handleSignIn} />
      <RevealSection><HowItWorks /></RevealSection>
      <RevealSection><InboxDemo /></RevealSection>
      <RevealSection><Transparency /></RevealSection>
      <RevealSection><Pricing onSignIn={handleSignIn} /></RevealSection>
      <RevealSection><FAQ /></RevealSection>
      <RevealSection><FinalCTA onSignIn={handleSignIn} /></RevealSection>
      <Footer />
    </LenisProvider>
  );
}
