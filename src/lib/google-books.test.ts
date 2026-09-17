import { describe, expect, it, vi, afterEach } from "vitest";
import { mapGoogleBookItem, searchGoogleBooks } from "./google-books";

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("lança erro amigável quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(searchGoogleBooks("O Hobbit")).rejects.toThrow(
      "Google Books"
    );
  });

  it("lança erro amigável quando há falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    await expect(searchGoogleBooks("O Hobbit")).rejects.toThrow("conexão");
  });
});
