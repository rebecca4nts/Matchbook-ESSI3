"use client";

import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { findMatches, findRegionalSuggestions } from "@/lib/match-utils";
import { Book, MatchResult, MatchSuggestion, UserProfile } from "@/lib/types";

function MatchCard({ match }: { match: MatchResult }) {
  const offeredTitles = match.wishedBooksOfferedByUser.map((book) => book.title).join(", ");
  const wishedTitles = match.offeredBooksWishedByUser.map((book) => book.title).join(", ");

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{match.profile.displayName}</h2>
          <p className="mt-1 text-sm text-stone-600">{match.profile.city} — {match.profile.state}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${match.isPerfect ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
          {match.isPerfect ? "Match Perfeito · 100%" : "Compatibilidade parcial"}
        </span>
      </div>
      <div className={`mt-5 grid gap-3 ${match.isPerfect ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Você procura</p>
          <p className="mt-1 font-medium text-stone-900">{offeredTitles}</p>
          <p className="mt-1 text-xs text-stone-600">Esta pessoa oferece.</p>
        </div>
        {match.isPerfect && <div className="rounded-lg bg-sky-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-sky-800">Esta pessoa procura</p><p className="mt-1 font-medium text-stone-900">{wishedTitles}</p><p className="mt-1 text-xs text-stone-600">Você oferece.</p></div>}
      </div>
    </article>
  );
}

function SuggestionCard({ suggestion }: { suggestion: MatchSuggestion }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{suggestion.isSameCity ? "Na sua cidade" : "No seu estado"}</p>
      <h3 className="mt-1 font-bold text-stone-900">{suggestion.book.title}</h3>
      <p className="text-sm text-stone-600">{suggestion.book.author}</p>
      <p className="mt-3 text-sm text-stone-700">Ofertado por {suggestion.profile.displayName} · {suggestion.profile.city}</p>
    </article>
  );
}

export default function MatchesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  const search = async () => {
    if (!user || !profile?.city || !profile.state) {
      setError("Complete sua cidade e estado no perfil antes de buscar compatibilidades.");
      return;
    }

    setError("");
    setIsSearching(true);
    setSearched(false);
    try {
      const [booksSnapshot, profilesSnapshot] = await Promise.all([
        getDocs(collection(db, "books")),
        getDocs(collection(db, "publicProfiles")),
      ]);
      const books = booksSnapshot.docs.map((book) => ({ id: book.id, ...book.data() }) as Book);
      const profiles = new Map(profilesSnapshot.docs.map((person) => [person.id, person.data() as UserProfile]));
      const results = findMatches(user.uid, profile, books, profiles);
      setMatches(results);
      setSuggestions(results.length ? [] : findRegionalSuggestions(user.uid, profile, books, profiles));
      setSearched(true);
    } catch (caughtError: unknown) {
      const code = typeof caughtError === "object" && caughtError && "code" in caughtError ? String(caughtError.code) : "";
      setError(code === "permission-denied" ? "Sem permissão para buscar matches. Publique as regras do Firestore incluídas no projeto." : "Não foi possível buscar compatibilidades agora. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  if (loading || !user) return <div className="grid min-h-screen place-items-center bg-stone-50 text-stone-700">Carregando...</div>;

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-800">Matchbook</p><h1 className="mt-1 text-3xl font-bold text-stone-900">Encontrar trocas</h1><p className="mt-2 text-stone-600">Matches perfeitos aparecem primeiro; depois, leitores da sua cidade e do seu estado.</p></div>
          <Link href="/profile" className="rounded-md border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-100">Meu perfil</Link>
        </header>
        <button onClick={search} disabled={isSearching} className="mt-6 rounded-md bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{isSearching ? "Buscando..." : "Buscar compatibilidades"}</button>
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {searched && <section className="mt-8 space-y-4">
          {matches.map((match) => <MatchCard key={match.userId} match={match} />)}
          {!matches.length && <><div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="font-bold">Nenhum match exato encontrado na sua região no momento</h2><p className="mt-1 text-sm">Veja outros livros oferecidos perto de você.</p></div>{suggestions.length ? <div><h2 className="mb-3 text-xl font-bold text-stone-900">Sugestões na sua região</h2><div className="grid gap-3 sm:grid-cols-2">{suggestions.map((suggestion) => <SuggestionCard key={suggestion.book.id} suggestion={suggestion} />)}</div></div> : <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center"><h2 className="font-bold text-stone-900">Ainda não há livros ou leitores disponíveis na sua região.</h2><p className="mt-1 text-sm text-stone-600">Convide leitores locais para ampliar as possibilidades de troca.</p></div>}</>}
        </section>}
      </div>
    </main>
  );
}
