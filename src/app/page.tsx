"use client";

import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { useAuth } from "@/lib/auth-context";
import { Logomark } from "@/components/auth/Logomark";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function Home() {
  const { user } = useAuth();

  return (
    <div
      className={`${inter.className} flex min-h-screen items-center justify-center px-5`}
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <Logomark size={44} />
        <h1
          className={`${fraunces.className} mt-4 text-[36px] leading-none`}
          style={{ color: "#EDE6D6" }}
        >
          Matchbook
        </h1>
        <p
          className="mt-3 text-[15px] max-w-[280px] leading-snug"
          style={{ color: "rgba(237,230,214,0.6)" }}
        >
          Encontre quem quer o livro que você tem e tem o livro que você quer
        </p>

        <div className="mt-8">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-block rounded-[2px] px-7 py-3 text-[15px] font-medium transition-transform active:scale-[0.98]"
              style={{ color: "#EDE6D6", background: "#8C3B2E" }}
            >
              Ir para o Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block rounded-[2px] px-7 py-3 text-[15px] font-medium transition-transform active:scale-[0.98]"
              style={{ color: "#EDE6D6", background: "#8C3B2E" }}
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
