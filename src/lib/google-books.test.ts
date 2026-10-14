import { describe, expect, it, vi, afterEach } from "vitest";
import { clearGoogleBooksCache, mapGoogleBookItem, searchGoogleBooks } from "./google-books";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  clearGoogleBooksCache();
});

describe("mapGoogleBookItem", () => {
  it("mapeia título, autores, gênero e capa (http -> https)", () => {
    const suggestion = mapGoogleBookItem({
      id: "abc123",
      volumeInfo: {
        title: "O Hobbit",
        authors: ["J.R.R. Tolkien"],
        categories: ["Fiction / Fantasy"],
        description: "Uma aventura na Terra-média.",
        publishedDate: "1937-09-21",
        imageLinks: { thumbnail: "http://exemplo.com/capa.jpg" },
      },
    });

    expect(suggestion).toMatchObject({
      googleId: "abc123",
      title: "O Hobbit",
      author: "J.R.R. Tolkien",
      authors: ["J.R.R. Tolkien"],
      genre: "Fiction / Fantasy",
      coverUrl: "https://exemplo.com/capa.jpg",
    });
  });

  it("une múltiplos autores e tolera campos ausentes", () => {
    const suggestion = mapGoogleBookItem({
      id: "sem-campos",
      volumeInfo: { title: "Sem Detalhes" },
    });

    expect(suggestion.author).toBe("");
    expect(suggestion.genre).toBe("");
    expect(suggestion.coverUrl).toBe("");
    expect(suggestion.description).toBe("");
  });
});

describe("searchGoogleBooks", () => {
  it("retorna [] sem chamar fetch para consulta em branco", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchGoogleBooks("   ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("consulta a API e retorna sugestões normalizadas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "hobbit1",
            volumeInfo: {
              title: "O Hobbit",
              authors: ["J.R.R. Tolkien"],
              categories: ["Fantasia"],
              imageLinks: { thumbnail: "https://exemplo.com/hobbit.jpg" },
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchGoogleBooks("O Hobbit");

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("www.googleapis.com/books/v1/volumes");
    expect(url).toContain(encodeURIComponent("O Hobbit"));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ title: "O Hobbit", genre: "Fantasia" });
  });

  it("lança erro amigável quando a API responde com falha após retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const result = expect(searchGoogleBooks("O Hobbit")).rejects.toThrow(
      "Google Books"
    );
    await vi.advanceTimersByTimeAsync(800);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lança erro de quota quando a API responde 429 após retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);

    const result = expect(searchGoogleBooks("O Hobbit")).rejects.toThrow(/429|Limite/);
    await vi.advanceTimersByTimeAsync(800);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("usa cache para não gastar quota em buscas repetidas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchGoogleBooks("O Hobbit");
    await searchGoogleBooks("O Hobbit");

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("inclui limite clampado e API key codificada na URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY", " chave & valor ");

    await searchGoogleBooks("  O Hobbit  ", 100);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("O Hobbit");
    expect(url.searchParams.get("maxResults")).toBe("40");
    expect(url.searchParams.get("printType")).toBe("books");
    expect(url.searchParams.get("key")).toBe("chave & valor");
  });

  it("repete uma vez após 429 e retorna o sucesso", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = expect(searchGoogleBooks("Duna")).resolves.toEqual([]);
    await vi.advanceTimersByTimeAsync(800);

    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retorna o erro da segunda resposta depois de um retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    const result = expect(searchGoogleBooks("Duna")).rejects.toThrow(/403|negado/i);
    await vi.advanceTimersByTimeAsync(800);

    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [400, /inválida/i],
    [403, /negado/i],
  ])("mapeia a resposta HTTP %i", async (status, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));

    await expect(searchGoogleBooks("Duna")).rejects.toThrow(message);
  });

  it("retorna lista vazia quando a resposta não contém items", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    await expect(searchGoogleBooks("Duna")).resolves.toEqual([]);
  });

  it("normaliza a consulta no cache e separa cache por quantidade de resultados", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchGoogleBooks("Duna");
    await searchGoogleBooks(" dUnA ");
    await searchGoogleBooks("Duna", 5);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lança erro amigável quando há falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    await expect(searchGoogleBooks("O Hobbit")).rejects.toThrow("conexão");
  });
});
