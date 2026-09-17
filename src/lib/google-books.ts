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
 * Retorna lista vazia para consultas em branco (evitairat o quota à toa).
 */
export async function searchGoogleBooks(
  query: string,
  maxResults = 8
): Promise<GoogleBookSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(q)}&maxResults=${Math.min(Math.max(maxResults, 1), 40)}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Não foi possível buscar na Google Books. Verifique sua conexão.");
  }
  if (!res.ok) {
    throw new Error("A busca na Google Books falhou. Tente novamente.");
  }

  const data = (await res.json()) as { items?: GoogleBooksItem[] };
  return (data.items ?? []).map(mapGoogleBookItem);
}
