import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getUserBooks, removeBook } from "./book-service";

vi.mock("firebase/firestore", () => ({
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
          coverUrl: "c1",
          ownerId: "user-1",
          type: "offered",
          status: "available",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        docSnapshot("b2", {
          title: "Novo",
          author: "B",
          coverUrl: "c2",
          ownerId: "user-1",
          type: "wanted",
          status: "available",
          createdAt: "2026-09-01T00:00:00.000Z",
        }),
      ],
    } as never);

    const books = await getUserBooks("user-1");

    expect(books.map((b) => b.id)).toEqual(["b2", "b1"]);
    expect(books[0]).toMatchObject({ title: "Novo", type: "wanted" });
    expect(books[1]).toMatchObject({ title: "Antigo", type: "offered" });
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
