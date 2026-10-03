"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clock3,
  Heart,
  Library,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import LocationInput from "@/components/LocationInput";
import { AddBookForm } from "@/components/books/AddBookForm";
import { useAuth } from "@/lib/auth-context";
import { Book, getUserBooks, removeBook } from "@/lib/book-service";

type Tab = "ALL" | "OFFERED" | "WISHED";

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "agora";

  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  const [amount, unit] = minutes < 60
    ? [minutes, "minute"]
    : minutes < 1440
      ? [Math.floor(minutes / 60), "hour"]
      : minutes < 43200
        ? [Math.floor(minutes / 1440), "day"]
        : [Math.floor(minutes / 43200), "month"];

  return new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }).format(
    -amount,
    unit as Intl.RelativeTimeFormatUnit
  );
}

export default function DashboardPage() {
  const { user, profile, loading, signOut, updateUserProfile } = useAuth();
  const router = useRouter();
  const addBookDialogRef = useRef<HTMLDialogElement>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [tab, setTab] = useState<Tab>("ALL");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileState, setProfileState] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [publicationNotice, setPublicationNotice] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserBooks(user.uid)
      .then((data) => {
        if (!cancelled) setBooks(data);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBooks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleAdded = useCallback((book: Book) => {
    setBooks((previous) => [book, ...previous]);
    setTab("ALL");
    setPublicationNotice(`“${book.title}” foi publicado no seu mural.`);
    addBookDialogRef.current?.close();
  }, []);

  const handleRemove = useCallback(async (bookId: string) => {
    setRemovingId(bookId);
    try {
      await removeBook(bookId);
      setBooks((previous) => previous.filter((book) => book.id !== bookId));
    } finally {
      setRemovingId(null);
    }
  }, []);

  const openProfileEditor = () => {
    setProfileName(profile?.displayName || user?.displayName || "");
    setProfileCity(profile?.city || "");
    setProfileState(profile?.state || "");
    setProfileLocation(profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : "");
    setProfileError("");
    setProfileNotice("");
    setEditingProfile(true);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");
    if (!profileName.trim() || !profileCity || !profileState) {
      setProfileError("Nome, cidade e estado são obrigatórios.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile({
        displayName: profileName.trim(),
        city: profileCity,
        state: profileState,
      });
      setProfileNotice("Perfil atualizado.");
      setEditingProfile(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <main
        className="grid min-h-screen place-items-center text-[#EDE6D6]"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)" }}
      >
        Carregando seu mural...
      </main>
    );
  }

  const offered = books.filter((book) => book.type === "OFFERED");
  const wished = books.filter((book) => book.type === "WISHED");
  const visibleBooks = tab === "ALL" ? books : books.filter((book) => book.type === tab);
  const displayName = profile?.displayName || user.displayName || "Leitor(a)";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const location = profile?.city && profile?.state
    ? `${profile.city}, ${profile.state}`
    : "Localização não informada";

  return (
    <main
      className="min-h-screen w-full px-4 py-5 sm:px-6 lg:px-8"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#EDE6D6]/10 pb-4">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-[#EDE6D6]">
            Matchbook
          </Link>
          <nav aria-label="Navegação da conta" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addBookDialogRef.current?.showModal()}
              className="inline-flex min-h-11 items-center gap-2 rounded-[2px] bg-[#8C3B2E] px-4 py-2.5 text-sm font-semibold text-[#EDE6D6] transition-colors hover:bg-[#762F25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EDE6D6]"
            >
              <Plus size={17} aria-hidden="true" />
              Publicar livro
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-11 rounded-[2px] border border-[#EDE6D6]/20 px-4 py-2.5 text-sm font-medium text-[#EDE6D6] transition-colors hover:bg-[#EDE6D6]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EDE6D6]"
            >
              Sair
            </button>
          </nav>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section id="mural" aria-labelledby="feed-title" className="order-2 min-w-0 scroll-mt-6 lg:order-1">
            {publicationNotice && (
              <p role="status" className="mb-4 rounded-[3px] border border-[#EDE6D6]/15 bg-[#5C6B4F]/20 px-4 py-3 text-sm text-[#EDE6D6]">
                {publicationNotice}
              </p>
            )}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EDE6D6]/55">Sua biblioteca em movimento</p>
                <h1 id="feed-title" className="mt-1 text-3xl font-bold text-[#EDE6D6]">Mural</h1>
              </div>
              <p className="text-sm text-[#EDE6D6]/65">{books.length} {books.length === 1 ? "publicação" : "publicações"}</p>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar publicações">
              {(
                [
                  { key: "ALL", label: "Tudo", count: books.length },
                  { key: "OFFERED", label: "Tenho", count: offered.length },
                  { key: "WISHED", label: "Estou buscando", count: wished.length },
                ] as const
              ).map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={tab === filter.key}
                  onClick={() => setTab(filter.key)}
                  className={`min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EDE6D6] ${
                    tab === filter.key
                      ? "border-[#EDE6D6] bg-[#EDE6D6] text-[#1B2530]"
                      : "border-[#EDE6D6]/20 text-[#EDE6D6]/75 hover:border-[#EDE6D6]/50 hover:bg-[#EDE6D6]/5"
                  }`}
                >
                  {filter.label} <span className="ml-1 opacity-65">{filter.count}</span>
                </button>
              ))}
            </div>

            {loadingBooks ? (
              <div className="rounded-[3px] bg-[#EDE6D6] p-6 text-sm text-[#1B2530]/65" role="status">
                Carregando suas publicações...
              </div>
            ) : visibleBooks.length === 0 ? (
              <div className="rounded-[3px] bg-[#EDE6D6] px-6 py-12 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#1B2530]/5 text-[#1B2530]/60">
                  {tab === "WISHED" ? <Heart size={24} aria-hidden="true" /> : <BookOpen size={24} aria-hidden="true" />}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#1B2530]">
                  {tab === "WISHED" ? "Nenhuma busca publicada" : tab === "OFFERED" ? "Nenhum livro ofertado" : "Seu mural começa aqui"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#1B2530]/65">
                  {tab === "WISHED"
                    ? "Adicione um livro desejado para registrar o que você procura."
                    : tab === "OFFERED"
                      ? "Adicione um livro ofertado para mostrar o que está disponível no seu acervo."
                      : "Publique um livro que você tem ou um título que está procurando."}
                </p>
                <button
                  type="button"
                  onClick={() => addBookDialogRef.current?.showModal()}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[2px] bg-[#8C3B2E] px-5 py-2.5 text-sm font-semibold text-[#EDE6D6] transition-colors hover:bg-[#762F25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                >
                  <Plus size={17} aria-hidden="true" />
                  Publicar primeiro livro
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {visibleBooks.map((book) => {
                  const isOffered = book.type === "OFFERED";
                  return (
                    <article key={book.id} className="overflow-hidden rounded-[3px] bg-[#EDE6D6] shadow-sm">
                      <header className="flex items-center gap-3 px-5 pt-5 sm:px-6">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1B2530] text-sm font-semibold text-[#EDE6D6]" aria-hidden="true">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1B2530]">{displayName}</p>
                          <p className="flex items-center gap-1 text-xs text-[#1B2530]/55">
                            <Clock3 size={12} aria-hidden="true" />
                            {formatTime(book.createdAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${isOffered ? "bg-[#5C6B4F]/12 text-[#46523C]" : "bg-[#8C3B2E]/10 text-[#762F25]"}`}>
                          {isOffered ? <BookOpen size={13} aria-hidden="true" /> : <Heart size={13} aria-hidden="true" />}
                          {isOffered ? "Tenho" : "Estou buscando"}
                        </span>
                      </header>

                      <div className="flex gap-5 px-5 py-5 sm:gap-6 sm:px-6 sm:py-6">
                        {book.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.coverUrl}
                            alt={`Capa de ${book.title}`}
                            className="h-40 w-28 shrink-0 rounded-[2px] bg-[#1B2530]/5 object-cover shadow-sm sm:h-48 sm:w-32"
                          />
                        ) : (
                          <div className="grid h-40 w-28 shrink-0 place-items-center rounded-[2px] bg-[#1B2530]/5 text-[#1B2530]/35 sm:h-48 sm:w-32" aria-hidden="true">
                            <BookOpen size={32} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 py-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C6B4F]">{book.genre}</p>
                          <h2 className="mt-1 text-xl font-bold leading-snug text-[#1B2530] sm:text-2xl">{book.title}</h2>
                          <p className="mt-1 text-sm text-[#1B2530]/65">por {book.author}</p>
                          {book.description && (
                            <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-[#1B2530]/75">{book.description}</p>
                          )}
                        </div>
                      </div>

                      <footer className="flex items-center justify-between border-t border-[#1B2530]/10 px-5 py-3 sm:px-6">
                        <span className="text-xs text-[#1B2530]/55">{isOffered ? "Disponível no seu acervo" : "Título na sua lista de desejos"}</span>
                        <button
                          type="button"
                          onClick={() => handleRemove(book.id)}
                          disabled={removingId === book.id}
                          aria-label={`Remover ${book.title} do mural`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-[2px] px-3 py-2 text-xs font-medium text-[#1B2530]/55 transition-colors hover:bg-[#8C3B2E]/10 hover:text-[#8C3B2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E] disabled:cursor-wait disabled:opacity-50"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Remover
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="order-1 space-y-4 lg:sticky lg:top-6 lg:order-2">
            <section className="rounded-[3px] bg-[#EDE6D6] p-5" aria-labelledby="profile-title">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1B2530] text-sm font-semibold text-[#EDE6D6]" aria-hidden="true">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 id="profile-title" className="truncate font-semibold text-[#1B2530]">{displayName}</h2>
                  <p className="truncate text-sm text-[#1B2530]/60">{user.email}</p>
                </div>
              </div>

              {editingProfile ? (
                <form noValidate onSubmit={saveProfile} className="mt-4 space-y-4 border-t border-[#1B2530]/10 pt-4">
                  <div>
                    <label htmlFor="profile-name" className="block text-sm font-medium text-[#1B2530]">Nome</label>
                    <input
                      id="profile-name"
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      autoComplete="name"
                      className="mt-1 min-h-11 w-full rounded-[2px] border border-[#1B2530]/20 bg-white/70 px-3 py-2 text-base text-[#1B2530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-location" className="block text-sm font-medium text-[#1B2530]">Cidade e estado</label>
                    <LocationInput
                      value={profileLocation}
                      required
                      onChange={(value, selected) => {
                        setProfileLocation(value);
                        setProfileCity(selected?.city || "");
                        setProfileState(selected?.stateCode || "");
                      }}
                    />
                    <p className="mt-1 text-xs text-[#1B2530]/60">Escolha uma sugestão para confirmar sua localização.</p>
                  </div>
                  {profileError && <p role="alert" className="text-sm text-[#8C3B2E]">{profileError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="min-h-11 flex-1 rounded-[2px] bg-[#8C3B2E] px-3 py-2 text-sm font-medium text-[#EDE6D6] transition-colors hover:bg-[#762F25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E] disabled:cursor-wait disabled:opacity-60"
                    >
                      {savingProfile ? "Salvando..." : "Salvar perfil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="min-h-11 rounded-[2px] border border-[#1B2530]/20 px-3 py-2 text-sm text-[#1B2530] hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="mt-4 flex items-start gap-2 border-t border-[#1B2530]/10 pt-4 text-sm text-[#1B2530]/65">
                    <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{location}</span>
                  </p>
                  <button
                    type="button"
                    onClick={openProfileEditor}
                    className="mt-4 min-h-11 w-full rounded-[2px] border border-[#1B2530]/20 px-4 py-2 text-sm font-medium text-[#1B2530] transition-colors hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                  >
                    Editar perfil
                  </button>
                </>
              )}
            </section>

            {profileNotice && <p role="status" className="rounded-[3px] bg-[#5C6B4F]/15 px-4 py-3 text-sm text-[#EDE6D6]">{profileNotice}</p>}

            <section id="meus-livros" className="rounded-[3px] bg-[#EDE6D6] p-5" aria-labelledby="collection-title">
              <div className="flex items-center gap-2">
                <Library size={18} className="text-[#1B2530]" aria-hidden="true" />
                <h2 id="collection-title" className="font-semibold text-[#1B2530]">Seu acervo</h2>
              </div>
              <div className="mt-4 divide-y divide-[#1B2530]/10">
                <button
                  type="button"
                  onClick={() => setTab("OFFERED")}
                  className="flex min-h-12 w-full items-center justify-between py-3 text-left hover:text-[#8C3B2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                >
                  <span className="flex items-center gap-2 text-sm text-[#1B2530]/70"><BookOpen size={15} aria-hidden="true" /> Tenho</span>
                  <span className="text-lg font-semibold text-[#1B2530]">{offered.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("WISHED")}
                  className="flex min-h-12 w-full items-center justify-between py-3 text-left hover:text-[#8C3B2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                >
                  <span className="flex items-center gap-2 text-sm text-[#1B2530]/70"><Heart size={15} aria-hidden="true" /> Estou buscando</span>
                  <span className="text-lg font-semibold text-[#1B2530]">{wished.length}</span>
                </button>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-[#1B2530]">Total no mural</span>
                  <span className="text-lg font-semibold text-[#1B2530]">{books.length}</span>
                </div>
              </div>
              <a
                href="#mural"
                onClick={() => setTab("ALL")}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-[2px] border border-[#1B2530]/20 px-4 py-2 text-sm font-medium text-[#1B2530] transition-colors hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
              >
                Ver todos os livros
              </a>
            </section>

            <section className="rounded-[3px] border border-[#EDE6D6]/15 px-5 py-4 text-[#EDE6D6]">
              <h2 className="text-sm font-semibold">Uma boa troca começa aqui</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#EDE6D6]/65">
                Mantenha sua lista atualizada para lembrar o que você oferece e os títulos que quer encontrar.
              </p>
            </section>
          </aside>
        </div>
      </div>

      <dialog
        ref={addBookDialogRef}
        aria-labelledby="add-book-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[3px] bg-[#EDE6D6] p-0 text-[#1B2530] shadow-2xl backdrop:bg-[#101820]/75"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="p-5 sm:p-7">
          <header className="mb-5 flex items-start justify-between gap-4 border-b border-[#1B2530]/10 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5C6B4F]">Seu mural</p>
              <h2 id="add-book-title" className="mt-1 text-xl font-bold text-[#1B2530]">Publicar um livro</h2>
              <p className="mt-1 text-sm text-[#1B2530]/60">Conte à comunidade o que você tem ou procura.</p>
            </div>
            <button
              type="button"
              onClick={() => addBookDialogRef.current?.close()}
              aria-label="Fechar publicação de livro"
              className="grid size-11 shrink-0 place-items-center rounded-[2px] text-[#1B2530]/60 transition-colors hover:bg-[#1B2530]/5 hover:text-[#1B2530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <AddBookForm userId={user.uid} onAdded={handleAdded} />
        </div>
      </dialog>
    </main>
  );
}
