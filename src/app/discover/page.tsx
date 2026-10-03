"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Heart, MapPin, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDiscoverableBooks, getPublicProfiles } from "@/lib/book-service";
import { findUserMatches, formatDistance, UserMatch } from "@/lib/matching";

export default function DiscoverPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    getDiscoverableBooks()
      .then(async (allBooks) => {
        const ownBooks = allBooks.filter((book) => book.userId === user.uid);
        const candidateIds = Array.from(new Set(allBooks
          .filter((book) => book.userId !== user.uid && book.type === "OFFERED" && book.status === "available")
          .map((book) => book.userId)));
        const profiles = await getPublicProfiles(candidateIds);
        if (cancelled) return;
        setMatches(findUserMatches({
          currentUserId: user.uid,
          wishedBooks: ownBooks.filter((book) => book.type === "WISHED"),
          books: allBooks,
          profiles,
          currentProfile: profile,
        }));
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os livros próximos. Tente novamente.");
      })
      .finally(() => {
        if (!cancelled) setLoadingMatches(false);
      });
    return () => { cancelled = true; };
  }, [profile, user]);

  const visibleMatches = useMemo(() => matches.filter((match) => !passedIds.includes(match.userId)), [matches, passedIds]);
  const currentMatch = visibleMatches[0];
  const handlePass = useCallback(() => {
    if (currentMatch) setPassedIds((previous) => [...previous, currentMatch.userId]);
  }, [currentMatch]);

  if (loading || !user) {
    return <main className="grid min-h-screen place-items-center text-[#EDE6D6]" style={{ background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)" }}>Carregando descoberta...</main>;
  }

  const initials = currentMatch?.profile.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8" style={{ background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)" }}>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between border-b border-[#EDE6D6]/10 pb-4">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-[#EDE6D6]">Matchbook</Link>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-[#EDE6D6]/20 px-4 py-2 text-sm text-[#EDE6D6] hover:bg-[#EDE6D6]/10"><ArrowLeft size={16} aria-hidden="true" /> Meu mural</Link>
        </header>

        <div className="mb-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EDE6D6]/55">Encontros literários perto de você</p>
          <h1 className="mt-1 text-3xl font-bold text-[#EDE6D6]">Descobrir livros</h1>
          <p className="mt-2 text-sm text-[#EDE6D6]/65">Pessoas que oferecem títulos da sua lista de desejos, primeiro as mais próximas.</p>
        </div>

        {loadingMatches ? (
          <div role="status" className="rounded-[3px] bg-[#EDE6D6] p-8 text-center text-[#1B2530]/65">Buscando pessoas com livros que você procura...</div>
        ) : error ? (
          <div role="alert" className="rounded-[3px] bg-[#EDE6D6] p-8 text-center text-[#762F25]">{error}</div>
        ) : !currentMatch ? (
          <section className="rounded-[3px] bg-[#EDE6D6] px-6 py-12 text-center">
            <BookOpen size={34} className="mx-auto text-[#5C6B4F]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-[#1B2530]">{passedIds.length ? "Você viu todas as sugestões" : "Nenhum match por enquanto"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#1B2530]/65">{passedIds.length ? "As pessoas que você passou podem aparecer novamente quando iniciar uma nova visita." : "Adicione livros à sua lista de desejos e volte para encontrar leitores que os oferecem."}</p>
            <Link href="/dashboard" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[2px] bg-[#8C3B2E] px-5 py-2 text-sm font-semibold text-[#EDE6D6] hover:bg-[#762F25]">Voltar ao mural</Link>
          </section>
        ) : (
          <article className="overflow-hidden rounded-[3px] bg-[#EDE6D6] shadow-xl">
            <header className="flex items-center gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1B2530] text-sm font-semibold text-[#EDE6D6]" aria-hidden="true">{initials}</div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-[#1B2530]">{currentMatch.profile.displayName}</h2>
                <p className="flex items-center gap-1 text-sm text-[#1B2530]/60"><MapPin size={14} aria-hidden="true" />{currentMatch.distanceKm !== null ? formatDistance(currentMatch.distanceKm) : [currentMatch.profile.city, currentMatch.profile.state].filter(Boolean).join(", ") || "Localização não informada"}</p>
              </div>
              <span className="rounded-full bg-[#5C6B4F]/12 px-3 py-1.5 text-xs font-semibold text-[#46523C]">{currentMatch.books.length} {currentMatch.books.length === 1 ? "livro em comum" : "livros em comum"}</span>
            </header>

            <div className="space-y-4 px-5 py-5 sm:px-7">
              {currentMatch.books.map(({ offered, wanted }) => (
                <section key={`${offered.id}-${wanted.id}`} className="flex gap-4 rounded-[3px] border border-[#1B2530]/10 bg-white/55 p-4">
                  {offered.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offered.coverUrl} alt={`Capa de ${offered.title}`} className="h-32 w-22 shrink-0 rounded-[2px] object-cover shadow-sm" />
                  ) : <div className="grid h-32 w-22 shrink-0 place-items-center rounded-[2px] bg-[#1B2530]/5 text-[#1B2530]/35" aria-hidden="true"><BookOpen size={28} /></div>}
                  <div className="min-w-0 py-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C6B4F]">Você procura</p>
                    <h3 className="mt-1 text-lg font-bold leading-snug text-[#1B2530]">{offered.title}</h3>
                    <p className="text-sm text-[#1B2530]/65">por {offered.author}</p>
                    <p className="mt-3 text-xs text-[#1B2530]/55">Oferecido por esta pessoa • {wanted.title} está na sua lista</p>
                  </div>
                </section>
              ))}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#1B2530]/10 px-5 py-4 sm:flex-row sm:px-7">
              <button type="button" onClick={handlePass} aria-label={`Passar ${currentMatch.profile.displayName}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[#8C3B2E]/35 text-sm font-semibold text-[#762F25] transition-colors hover:bg-[#8C3B2E]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"><X size={20} aria-hidden="true" /> Passar</button>
              <Link href={`/profile/${encodeURIComponent(currentMatch.userId)}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#5C6B4F] px-5 text-sm font-semibold text-[#EDE6D6] transition-colors hover:bg-[#46523C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2530]"><Heart size={17} aria-hidden="true" /> Ver perfil</Link>
            </footer>
          </article>
        )}
        {!loadingMatches && matches.length > 0 && <p className="mt-4 text-center text-xs text-[#EDE6D6]/45">{Math.min(passedIds.length + 1, matches.length)} de {matches.length} sugestões · X apenas remove da sessão atual</p>}
      </div>
    </main>
  );
}
