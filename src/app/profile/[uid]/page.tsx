"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Heart, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Book, getPublicProfile, getUserPublicBooks } from "@/lib/book-service";
import type { UserProfile } from "@/lib/types";

export default function PublicProfilePage() {
  const params = useParams<{ uid: string }>();
  const uid = params.uid;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || !uid) return;
    let cancelled = false;
    Promise.all([getPublicProfile(uid), getUserPublicBooks(uid)])
      .then(([publicProfile, publicBooks]) => {
        if (cancelled) return;
        setProfile(publicProfile);
        setBooks(publicBooks);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar este perfil.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => { cancelled = true; };
  }, [uid, user]);

  const offered = useMemo(() => books.filter((book) => book.type === "OFFERED"), [books]);
  const wished = useMemo(() => books.filter((book) => book.type === "WISHED"), [books]);
  const initials = profile?.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  if (loading || !user || loadingProfile) {
    return <main className="grid min-h-screen place-items-center text-[#EDE6D6]" style={{ background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)" }}>Carregando perfil...</main>;
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8" style={{ background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)" }}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between border-b border-[#EDE6D6]/10 pb-4">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-[#EDE6D6]">Matchbook</Link>
          <Link href="/discover" className="inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-[#EDE6D6]/20 px-4 py-2 text-sm text-[#EDE6D6] hover:bg-[#EDE6D6]/10"><ArrowLeft size={16} aria-hidden="true" /> Descoberta</Link>
        </header>

        {error ? (
          <p role="alert" className="rounded-[3px] bg-[#EDE6D6] p-6 text-center text-[#762F25]">{error}</p>
        ) : !profile ? (
          <p className="rounded-[3px] bg-[#EDE6D6] p-6 text-center text-[#1B2530]/65">Este perfil não está disponível.</p>
        ) : (
          <>
            <section className="rounded-[3px] bg-[#EDE6D6] p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#1B2530] text-lg font-semibold text-[#EDE6D6]" aria-hidden="true">{initials}</div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-[#1B2530]">{profile.displayName}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-[#1B2530]/60"><MapPin size={15} aria-hidden="true" />{[profile.city, profile.state].filter(Boolean).join(", ") || "Localização não informada"}</p>
                </div>
              </div>
              <p className="mt-5 border-t border-[#1B2530]/10 pt-4 text-sm text-[#1B2530]/60">{offered.length} {offered.length === 1 ? "livro disponível" : "livros disponíveis"} · {wished.length} {wished.length === 1 ? "livro procurado" : "livros procurados"}</p>
            </section>

            {books.length === 0 ? (
              <section className="mt-5 rounded-[3px] bg-[#EDE6D6] px-6 py-10 text-center">
                <BookOpen size={30} className="mx-auto text-[#5C6B4F]" aria-hidden="true" />
                <h2 className="mt-3 font-semibold text-[#1B2530]">Nenhum livro disponível</h2>
                <p className="mt-1 text-sm text-[#1B2530]/60">Este perfil ainda não publicou livros.</p>
              </section>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {books.map((book) => (
                  <article key={book.id} className="overflow-hidden rounded-[3px] bg-[#EDE6D6]">
                    <div className="flex gap-4 p-4">
                      {book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.coverUrl} alt={`Capa de ${book.title}`} className="h-36 w-24 shrink-0 rounded-[2px] object-cover shadow-sm" />
                      ) : <div className="grid h-36 w-24 shrink-0 place-items-center rounded-[2px] bg-[#1B2530]/5 text-[#1B2530]/35" aria-hidden="true"><BookOpen size={28} /></div>}
                      <div className="min-w-0 py-1">
                        <p className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] ${book.type === "OFFERED" ? "text-[#5C6B4F]" : "text-[#8C3B2E]"}`}>{book.type === "OFFERED" ? <BookOpen size={13} aria-hidden="true" /> : <Heart size={13} aria-hidden="true" />}{book.type === "OFFERED" ? "Oferece" : "Procura"}</p>
                        <h2 className="mt-2 text-lg font-bold leading-snug text-[#1B2530]">{book.title}</h2>
                        <p className="mt-1 text-sm text-[#1B2530]/65">por {book.author}</p>
                        <p className="mt-2 text-xs text-[#1B2530]/55">{book.genre}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
