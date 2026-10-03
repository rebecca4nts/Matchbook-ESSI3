"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">Matchbook</h1>
        <p className="mb-8 text-lg text-gray-600">
          Encontre e troque livros
        </p>
        <div className="flex justify-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Ir para o Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
