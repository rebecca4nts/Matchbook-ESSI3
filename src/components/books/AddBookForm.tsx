"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Heart, Loader2, Search } from "lucide-react";
import {
  addBook,
  Book,
  BookType,
  BookValidationError,
} from "@/lib/book-service";
import {
  GoogleBookSuggestion,
  searchGoogleBooks,
} from "@/lib/google-books";

interface AddBookFormProps {
  userId: string;
  onAdded: (book: Book) => void;
}

const SUCCESS_MESSAGE: Record<BookType, string> = {
  OFFERED: "Livro adicionado aos seus Ofertados!",
  WISHED: "Livro adicionado aos seus Desejados!",
};

export function AddBookForm({ userId, onAdded }: AddBookFormProps) {
  const [type, setType] = useState<BookType>("OFFERED");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [googleId, setGoogleId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string | undefined>(undefined);

  const [suggestions, setSuggestions] = useState<GoogleBookSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    author?: string;
    genre?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita que escolher uma sugestão dispare uma nova busca com o título aplicado.
  const suppressSearchRef = useRef(false);
  // Ignora respostas de buscas antigas quando o usuário continua digitando.
  const requestIdRef = useRef(0);

  const handleTitleChange = (value: string) => {
    suppressSearchRef.current = false;
    setTitle(value);
    setSearchError(null);
    if (value.trim().length < 3) {
      requestIdRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      setHasSearched(false);
    } else {
      setSearching(true);
      setShowSuggestions(true);
    }
  };

  // Busca Google Books com debounce enquanto digita o título.
  // setStates acontecem no handler de mudança e no callback do
  // temporizador — nunca de forma síncrona no corpo do efeito.
  useEffect(() => {
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }
    if (title.trim().length < 3) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = (requestIdRef.current += 1);
    debounceRef.current = setTimeout(async () => {
      // Se outra tecla foi pressionada enquanto aguardava o debounce, ignora.
      if (requestId !== requestIdRef.current) return;
      setSearching(true);
      setSearchError(null);
      try {
        const results = await searchGoogleBooks(title.trim());
        if (requestId !== requestIdRef.current) return;
        // Ignora itens sem título (não renderizam linha útil no dropdown).
        setSuggestions(results.filter((r) => r.title.trim().length > 0));
        setShowSuggestions(true);
        setHasSearched(true);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setShowSuggestions(true);
        setHasSearched(true);
        setSearchError(
          err instanceof Error ? err.message : "A busca na Google Books falhou."
        );
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title]);

  // Fecha a lista de sugestões ao clicar fora.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const applySuggestion = (s: GoogleBookSuggestion) => {
    suppressSearchRef.current = true;
    requestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTitle(s.title);
    if (s.author) setAuthor(s.author);
    if (s.genre) setGenre(s.genre);
    setCoverUrl(s.coverUrl);
    setGoogleId(s.googleId || undefined);
    setDescription(s.description || undefined);
    setFieldErrors({});
    setSuggestions([]);
    setShowSuggestions(false);
    setSearching(false);
    setSearchError(null);
    setHasSearched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    // Validação local (Cenário 2.1): impede o envio e alerta os campos.
    const localErrors: typeof fieldErrors = {};
    if (!title.trim()) localErrors.title = "Título é obrigatório.";
    if (!author.trim()) localErrors.author = "Autor é obrigatório.";
    if (!genre.trim()) localErrors.genre = "Gênero é obrigatório.";
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      const book = await addBook({
        userId,
        title,
        author,
        genre,
        type,
        ...(coverUrl ? { coverUrl } : {}),
        ...(googleId ? { googleId } : {}),
        ...(description ? { description } : {}),
      });
      // Atualização imediata da lista (Cenário 3.1): sem reload.
      onAdded(book);
      setSuccess(SUCCESS_MESSAGE[type]);
      setTitle("");
      setAuthor("");
      setGenre("");
      setCoverUrl("");
      setGoogleId(undefined);
      setDescription(undefined);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      setSearchError(null);
      setHasSearched(false);
    } catch (err) {
      if (err instanceof BookValidationError) {
        setFieldErrors(err.fields);
      } else {
        setSubmitError(
          err instanceof Error ? err.message : "Ocorreu um erro. Tente novamente."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-transparent outline-none text-[15px] text-[#1B2530] placeholder:text-[#1B2530]/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Seleção do tipo (Cenários 1.1 / 1.2) */}
      <div>
        <span className="block text-[13px] text-[#5C6B4F] mb-1.5 font-medium tracking-wide">
          Tipo de livro
        </span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de livro">
          {(
            [
              { value: "OFFERED", label: "Ofertado", icon: BookOpen },
              { value: "WISHED", label: "Desejado", icon: Heart },
            ] as const
          ).map((opt) => {
            const active = type === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setType(opt.value)}
                className={`flex items-center justify-center gap-2 rounded-[2px] border px-3 py-2.5 text-[14px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "border-[#8C3B2E] bg-[#8C3B2E] text-[#EDE6D6]"
                    : "border-[#1B2530]/25 text-[#1B2530]/70 hover:border-[#1B2530]/50"
                }`}
              >
                <Icon size={16} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Título com autocomplete Google Books */}
      <div ref={boxRef} className="relative">
        <label className="block">
          <span className="block text-[13px] text-[#5C6B4F] mb-1.5 font-medium tracking-wide">
            Título *
          </span>
          <div className="flex items-center gap-2 border-b border-[#1B2530]/25 focus-within:border-[#8C3B2E] transition-colors pb-2">
            <Search size={16} className="text-[#1B2530]/40 shrink-0" />
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0 || searchError || hasSearched)
                  setShowSuggestions(true);
              }}
              placeholder="Digite para buscar na Google Books…"
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="google-books-suggestions"
              aria-autocomplete="list"
              aria-invalid={Boolean(fieldErrors.title)}
              className={inputClass}
            />
            {searching && <Loader2 size={16} className="animate-spin text-[#1B2530]/40 shrink-0" />}
          </div>
        </label>
        {fieldErrors.title && (
          <p role="alert" className="mt-1 text-[13px]" style={{ color: "#8C3B2E" }}>
            {fieldErrors.title}
          </p>
        )}
        {showSuggestions && (searching || searchError || hasSearched || suggestions.length > 0) && (
          <ul
            id="google-books-suggestions"
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
          >
            {searching && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin shrink-0" />
                Buscando na Google Books…
              </li>
            )}
            {!searching && searchError && (
              <li className="px-3 py-3 text-sm text-[#8C3B2E]">{searchError}</li>
            )}
            {!searching &&
              !searchError &&
              hasSearched &&
              suggestions.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">
                  Nenhum livro encontrado. Tente outro título.
                </li>
              )}
            {suggestions.map((s, index) => (
              <li key={s.googleId || `${s.title}-${index}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Seleciona antes do clique fora fechar a lista.
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                  onClick={() => applySuggestion(s)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer"
                >
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.coverUrl} alt="" className="h-12 w-8 object-cover rounded-sm shrink-0" />
                  ) : (
                    <span className="flex h-12 w-8 items-center justify-center rounded-sm bg-gray-100 shrink-0">
                      <BookOpen size={14} className="text-gray-400" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {[s.author, s.genre].filter(Boolean).join(" • ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block">
          <span className="block text-[13px] text-[#5C6B4F] mb-1.5 font-medium tracking-wide">
            Autor *
          </span>
          <div className="flex items-center gap-2 border-b border-[#1B2530]/25 focus-within:border-[#8C3B2E] transition-colors pb-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Ex.: J.R.R. Tolkien"
              aria-invalid={Boolean(fieldErrors.author)}
              className={inputClass}
            />
          </div>
        </label>
        {fieldErrors.author && (
          <p role="alert" className="mt-1 text-[13px]" style={{ color: "#8C3B2E" }}>
            {fieldErrors.author}
          </p>
        )}
      </div>

      <div>
        <label className="block">
          <span className="block text-[13px] text-[#5C6B4F] mb-1.5 font-medium tracking-wide">
            Gênero *
          </span>
          <div className="flex items-center gap-2 border-b border-[#1B2530]/25 focus-within:border-[#8C3B2E] transition-colors pb-2">
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Ex.: Fantasia"
              aria-invalid={Boolean(fieldErrors.genre)}
              className={inputClass}
            />
          </div>
        </label>
        {fieldErrors.genre && (
          <p role="alert" className="mt-1 text-[13px]" style={{ color: "#8C3B2E" }}>
            {fieldErrors.genre}
          </p>
        )}
      </div>

      {coverUrl && (
        <div className="flex items-center gap-3 rounded-[2px] bg-[#1B2530]/5 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt={`Capa de ${title}`} className="h-16 w-11 object-cover rounded-sm" />
          <p className="text-[12.5px] text-[#1B2530]/60">Capa encontrada na Google Books.</p>
        </div>
      )}

      {submitError && (
        <p role="alert" className="text-[13px] leading-snug" style={{ color: "#8C3B2E" }}>
          {submitError}
        </p>
      )}
      {success && (
        <p role="status" className="text-[13px] font-medium leading-snug" style={{ color: "#5C6B4F" }}>
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 mt-1 rounded-[2px] text-[15px] font-medium transition-transform active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        style={{ color: "#EDE6D6", background: "#8C3B2E" }}
      >
        {submitting ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}
