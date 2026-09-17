import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  addBook,
  BookValidationError,
  getUserBooks,
  normalizeBookType,
  removeBook,
  validateBookInput,
} from "./book-service";

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock("./firebase", () => ({
  db: {},
}));

const mockedAddDoc = vi.mocked(addDoc);
const mockedCollection = vi.mocked(collection);
const mockedDeleteDoc = vi.mocked(deleteDoc);
const mockedDoc = vi.mocked(doc);
const mockedGetDocs = vi.mocked(getDocs);
const mockedQuery = vi.mocked(query);
const mockedWhere = vi.mocked(where);

function docSnapshot(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeBookType", () => {
  it("aceita os tipos canônicos OFFERED e WISHED", () => {
    expect(normalizeBookType("OFFERED")).toBe("OFFERED");
    expect(normalizeBookType("WISHED")).toBe("WISHED");
  });

  it("converte os tipos legados offered/wanted", () => {
    expect(normalizeBookType("offered")).toBe("OFFERED");
    expect(normalizeBookType("wanted")).toBe("WISHED");
  });

  it("rejeita tipos desconhecidos", () => {
    expect(() => normalizeBookType("emprestado")).toThrow("inválido");
  });
});

describe("validateBookInput", () => {
  it("não lança erro quando todos os campos estão preenchidos", () => {
    expect(() =>
      validateBookInput({
        title: "O Hobbit",
        author: "J.R.R. Tolkien",
        genre: "Fantasia",
      })
    ).not.toThrow();
  });

  it("aponta Título e Autor/Gênero como obrigatórios (Cenário 2.1)", () => {
    try {
      validateBookInput({ title: "  ", author: "", genre: "" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(BookValidationError);
      const fields = (err as BookValidationError).fields;
      expect(fields.title).toMatch(/obrigatório/i);
      expect(fields.author).toMatch(/obrigatório/i);
      expect(fields.genre).toMatch(/obrigatório/i);
    }
  });
});

describe("addBook", () => {
  it("grava na coleção books com a estrutura do Cenário 4.1 (Cenário 1.1)", async () => {
    // @ts-expect-error valores mockados
    mockedCollection.mockReturnValue("books-ref");
    mockedAddDoc.mockResolvedValue({ id: "new-id" } as never);

    const book = await addBook({
      userId: "user-1",
      title: "O Hobbit",
      author: "J.R.R. Tolkien",
      genre: "Fantasia",
      type: "OFFERED",
    });

    expect(mockedCollection).toHaveBeenCalledWith({}, "books");
    expect(mockedAddDoc).toHaveBeenCalledWith(
      "books-ref",
      expect.objectContaining({
        userId: "user-1",
        title: "O Hobbit",
        author: "J.R.R. Tolkien",
        genre: "Fantasia",
        type: "OFFERED",
      })
    );
    const payload = mockedAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(typeof payload.createdAt).toBe("string");
    expect(book).toMatchObject({ id: "new-id", type: "OFFERED" });
  });

  it("cadastra livro desejado associado ao userId (Cenário 1.2)", async () => {
    mockedAddDoc.mockResolvedValue({ id: "wished-id" } as never);

    const book = await addBook({
      userId: "user-9",
      title: "Duna",
      author: "Frank Herbert",
      genre: "Ficção científica",
      type: "WISHED",
    });

    expect(book.userId).toBe("user-9");
    expect(book.type).toBe("WISHED");
  });

  it("impede o envio sem Título/Autor/Gênero (Cenário 2.1)", async () => {
    await expect(
      addBook({ userId: "user-1", title: "", author: "", genre: "", type: "OFFERED" })
    ).rejects.toBeInstanceOf(BookValidationError);
    expect(mockedAddDoc).not.toHaveBeenCalled();
  });

  it("exige usuário autenticado", async () => {
    await expect(
      addBook({
        userId: "",
        title: "O Hobbit",
        author: "J.R.R. Tolkien",
        genre: "Fantasia",
        type: "OFFERED",
      })
    ).rejects.toThrow("autenticado");
  });
});

describe("getUserBooks", () => {
  it("consulta a coleção books filtrando pelo ownerId", async () => {
    mockedGetDocs.mockResolvedValue({ docs: [] } as never);
    // @ts-expect-error valores mockados
    mockedQuery.mockReturnValue("query-ref");
    // @ts-expect-error valores mockados
    mockedWhere.mockReturnValue("owner-filter");
    // @ts-expect-error valores mockados
    mockedCollection.mockReturnValue("books-ref");

    await getUserBooks("user-1");

    expect(mockedCollection).toHaveBeenCalledWith({}, "books");
    expect(mockedWhere).toHaveBeenCalledWith("ownerId", "==", "user-1");
    expect(mockedQuery).toHaveBeenCalledWith("books-ref", "owner-filter");
    expect(mockedGetDocs).toHaveBeenCalledWith("query-ref");
  });

  it("mapeia os docs para Book[] ordenados por createdAt desc", async () => {
    mockedGetDocs.mockResolvedValue({
      docs: [
        docSnapshot("b1", {
          title: "Antigo",
          author: "A",
          genre: "Drama",
          coverUrl: "c1",
          ownerId: "user-1",
          type: "OFFERED",
          status: "available",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        docSnapshot("b2", {
          title: "Novo",
          author: "B",
          genre: "Fantasia",
          coverUrl: "c2",
          ownerId: "user-1",
          type: "WISHED",
          status: "available",
          createdAt: "2026-09-01T00:00:00.000Z",
        }),
      ],
    } as never);

    const books = await getUserBooks("user-1");

    expect(books.map((b) => b.id)).toEqual(["b2", "b1"]);
    expect(books[0]).toMatchObject({ title: "Novo", type: "WISHED" });
    expect(books[1]).toMatchObject({ title: "Antigo", type: "OFFERED" });
  });

  it("normaliza docs legados (ownerId + offered/wanted)", async () => {
    mockedGetDocs.mockResolvedValue({
      docs: [
        docSnapshot("legacy", {
          title: "Legado",
          author: "A",
          coverUrl: "",
          ownerId: "user-1",
          type: "offered",
          status: "available",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ],
    } as never);

    const books = await getUserBooks("user-1");

    expect(books[0]).toMatchObject({
      userId: "user-1",
      type: "OFFERED",
    });
  });

  it("retorna lista vazia quando o usuário não tem livros", async () => {
    mockedGetDocs.mockResolvedValue({ docs: [] } as never);

    await expect(getUserBooks("user-sem-livros")).resolves.toEqual([]);
  });

  it("propaga erro do Firestore", async () => {
    mockedGetDocs.mockRejectedValue(new Error("firestore indisponível"));

    await expect(getUserBooks("user-1")).rejects.toThrow(
      "firestore indisponível"
    );
  });
});

describe("removeBook", () => {
  it("remove o doc do livro da coleção books", async () => {
    // @ts-expect-error valores mockados
    mockedDoc.mockReturnValue("book-ref");
    mockedDeleteDoc.mockResolvedValue(undefined);

    await removeBook("book-123");

    expect(mockedDoc).toHaveBeenCalledWith({}, "books", "book-123");
    expect(mockedDeleteDoc).toHaveBeenCalledWith("book-ref");
  });

  it("propaga erro do Firestore (ex.: regra de ownerId)", async () => {
    mockedDeleteDoc.mockRejectedValue(new Error("permission-denied"));

    await expect(removeBook("book-123")).rejects.toThrow("permission-denied");
  });
});
