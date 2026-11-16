/**
 * Integração com a API pública do Google Books.
 * Usada no cadastro de livros para autocompletar
 * título, autor, gênero e capa a partir de uma busca.
 *
 * Referência: https://developers.google.com/books/docs/v1/using
 */

export interface GoogleBookSuggestion {
  googleId: string;
  title: string;
  /** Autores unidos por ", " (formato usado no Firestore). */
  author: string;
  authors: string[];
  /** Primeira categoria retornada pela API (ex.: "Fiction / Fantasy"). */
  genre: string;
  categories: string[];
  description: string;
  coverUrl: string;
  publishedDate: string;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  categories?: string[];
  description?: string;
  publishedDate?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
}

interface GoogleBooksItem {
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

/**
 * Normaliza um item bruto da API para o formato usado no app.
 * Exportada para permitir testes unitários sem rede.
 */
export function mapGoogleBookItem(item: GoogleBooksItem): GoogleBookSuggestion {
  const info = item.volumeInfo ?? {};
  const authors = info.authors ?? [];
  const categories = info.categories ?? [];
  const rawCover =
    info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? "";

  return {
    googleId: item.id,
    title: info.title ?? "",
    author: authors.join(", "),
    authors,
    genre: categories[0] ?? "",
    categories,
    description: info.description ?? "",
    coverUrl: rawCover ? toHttps(rawCover) : "",
    publishedDate: info.publishedDate ?? "",
  };
}

/**
 * Busca obras na API do Google Books por título/autor/ISBN.
 * Retorna lista vazia para consultas em branco (evita gastar a quota à toa).
 *
 * A quota anônima da API é baixa e compartilhada por IP, então erros 429
 * (quota excedida) são comuns. Defina NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
 * (chave gratuita com a Books API ativada) para ter quota própria.
 */
const searchCache = new Map<string, GoogleBookSuggestion[]>();

/** Limpa o cache em memória (usado nos testes). */
export function clearGoogleBooksCache(): void {
  searchCache.clear();
}

function buildSearchUrl(query: string, maxResults: number): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY?.trim();
  let url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(query)}&maxResults=${Math.min(Math.max(maxResults, 1), 40)}&printType=books`;
  if (key) url += `&key=${encodeURIComponent(key)}`;
  return url;
}

function toSearchError(status: number): Error {
  if (status === 429) {
    return new Error(
      "Limite de buscas na Google Books excedido (erro 429). " +
        "Aguarde alguns minutos ou configure NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY para ter quota própria."
    );
  }
  if (status === 400) {
    return new Error("Busca inválida na Google Books. Tente outro título.");
  }
  if (status === 403) {
    return new Error(
      "Acesso à Google Books negado (erro 403). Verifique a chave NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY e as restrições dela."
    );
  }
  if (status >= 500) {
    return new Error("A Google Books está indisponível no momento. Tente novamente.");
  }
  return new Error("A busca na Google Books falhou. Tente novamente.");
}

export async function searchGoogleBooks(
  query: string,
  maxResults = 8
): Promise<GoogleBookSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const cacheKey = `${q.toLowerCase()}|${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const url = buildSearchUrl(q, maxResults);

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Não foi possível buscar na Google Books. Verifique sua conexão.");
  }

  // Uma nova tentativa para erros transitórios (rate limit por minuto / 5xx).
  if (!res.ok && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      res = await fetch(url);
    } catch {
      throw new Error("Não foi possível buscar na Google Books. Verifique sua conexão.");
    }
  }

  if (!res.ok) {
    throw toSearchError(res.status);
  }

  const data = (await res.json()) as { items?: GoogleBooksItem[] };
  const suggestions = (data.items ?? []).map(mapGoogleBookItem);
  searchCache.set(cacheKey, suggestions);
  return suggestions;
}
