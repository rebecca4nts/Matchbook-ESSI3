"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Heart, Library, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Book, getUserBooks, removeBook } from "@/lib/book-service";
import { AddBookForm } from "@/components/books/AddBookForm";

type Tab = "OFFERED" | "WISHED";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [tab, setTab] = useState<Tab>("OFFERED");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
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

  // Cenário 3.1: o novo livro entra na lista sem recarregar a página.
  const handleAdded = useCallback((book: Book) => {
    setBooks((prev) => [book, ...prev]);
    setTab(book.type);
  }, []);

  const handleRemove = useCallback(async (bookId: string) => {
    setRemovingId(bookId);
    try {
      await removeBook(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } finally {
      setRemovingId(null);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const offered = books.filter((b) => b.type === "OFFERED");
  const wished = books.filter((b) => b.type === "WISHED");
  const visible = tab === "OFFERED" ? offered : wished;

  return (
    <div
      className="min-h-screen w-full px-5 py-10"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#EDE6D6" }}>
              Dashboard
            </h1>
            <p className="text-sm" style={{ color: "rgba(237,230,214,0.6)" }}>
              Boas vindas, {user.displayName ?? user.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 cursor-pointer"
          >
            Sair
          </button>
        </div>

        {/* Cadastro de livros */}
        <section
          className="rounded-b-[3px] rounded-tr-[3px] px-6 pt-6 pb-7"
          style={{ background: "#EDE6D6" }}
          aria-label="Cadastrar livro"
        >
          <h2 className="mb-4 text-[16px] font-semibold text-[#1B2530]">
            Cadastrar livro
          </h2>
          <AddBookForm userId={user.uid} onAdded={handleAdded} />
        </section>

        {/* Seus Livros */}
        <section
          className="mt-6 rounded-[3px] px-6 pt-6 pb-7"
          style={{ background: "#EDE6D6" }}
          aria-label="Seus Livros"
        >
          <div className="mb-4 flex items-center gap-2">
            <Library size={18} className="text-[#1B2530]" />
            <h2 className="text-[16px] font-semibold text-[#1B2530]">
              Seus Livros
            </h2>
          </div>

          <div className="mb-4 flex gap-2" role="tablist" aria-label="Filtrar livros">
            {(
              [
                { key: "OFFERED", label: `Ofertados (${offered.length})`, icon: BookOpen },
                { key: "WISHED", label: `Desejados (${wished.length})`, icon: Heart },
              ] as const
            ).map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 rounded-[2px] px-4 py-2 text-[14px] font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-[#1B2530] text-[#EDE6D6]"
                      : "bg-[#1B2530]/10 text-[#1B2530]/70 hover:bg-[#1B2530]/15"
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {loadingBooks ? (
            <p className="text-[14px] text-[#1B2530]/60">Carregando seus livros...</p>
          ) : visible.length === 0 ? (
            <p className="text-[14px] text-[#1B2530]/60">
              {tab === "OFFERED"
                ? "Você ainda não ofertou nenhum livro."
                : "Você ainda não desejou nenhum livro."}
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((book) => (
                <li
                  key={book.id}
                  className="flex items-center gap-3 rounded-[2px] border border-[#1B2530]/10 bg-white/60 p-3"
                >
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt={`Capa de ${book.title}`}
                      className="h-16 w-11 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-sm bg-[#1B2530]/10">
                      <BookOpen size={16} className="text-[#1B2530]/40" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-[#1B2530]">
                      {book.title}
                    </p>
                    <p className="truncate text-[13px] text-[#1B2530]/60">
                      {[book.author, book.genre].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(book.id)}
                    disabled={removingId === book.id}
                    aria-label={`Remover ${book.title}`}
                    className="shrink-0 rounded-[2px] p-2 text-[#1B2530]/40 hover:bg-[#8C3B2E]/10 hover:text-[#8C3B2E] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
