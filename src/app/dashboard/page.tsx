"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8">
      <div className="mx-auto max-w-2xl rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-800">Matchbook</p><h1 className="mt-1 text-3xl font-bold">Boas-vindas, {profile?.displayName || user.displayName || "leitor(a)"}!</h1><p className="mt-3 text-stone-600">Encontre leitores próximos com livros compatíveis para troca.</p></div>
          <button onClick={handleSignOut} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">Sair</button>
        </div>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/matches" className="inline-block rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">Buscar compatibilidades</Link><Link href="/profile" className="inline-block rounded-md border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-100">Ver meu perfil</Link></div>
      </div>
    </main>
  );
}
