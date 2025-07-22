"use client";

import Image from "next/image";
import LogoShit from "../assets/logo.png";

export default function DashbaordHeader() {
  return (
    <>
      <header className="text-white min-h-12 border-b-cyan-50 border-b-1">
        <div className="flex flex-row justify-around items-center min-h-full">
          <div className="flex flex-row items-center gap-4">
            <Logo />
            <span className="text-white text-2xl font-bold">Inbox Ghost</span>
          </div>

          <div className="flex flex-row items-center text-white text-2xl font-medium gap-4">
            <span>Sign Out</span>
            <span>Sign In</span>

          </div>
        </div>
      </header>
    </>
  );
}

function Logo() {
  return <Image src={LogoShit} width={30} height={30} alt="Logo" />;
}
