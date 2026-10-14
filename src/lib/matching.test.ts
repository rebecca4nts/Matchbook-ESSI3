import { describe, expect, it } from "vitest";
import type { Book } from "@/lib/book-service";
import type { UserProfile } from "@/lib/types";
import { calculateDistanceKm, findUserMatches, normalizeBookValue } from "./matching";

function book(overrides: Partial<Book>): Book {
  return {
    id: "book",
    userId: "owner",
    ownerId: "owner",
    title: "O Hobbit",
    author: "J. R. R. Tolkien",
    genre: "Fantasia",
    coverUrl: "",
    type: "OFFERED",
    status: "available",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const currentProfile: UserProfile = { displayName: "Eu", city: "São Paulo", state: "SP", latitude: -23.55, longitude: -46.63 };

 describe("normalizeBookValue", () => {
  it("ignora caixa, acentos e pontuação", () => {
    expect(normalizeBookValue("  Coração—de Leão! ")).toBe("coracao de leao");
  });
});

describe("calculateDistanceKm", () => {
  it("calcula distância aproximada entre São Paulo e Rio de Janeiro", () => {
    expect(calculateDistanceKm({ latitude: -23.55, longitude: -46.63 }, { latitude: -22.91, longitude: -43.2 })).toBeCloseTo(358, -1);
  });
});

describe("findUserMatches", () => {
  it("agrupa ofertas de outros leitores que correspondem por título e autor", () => {
    const matches = findUserMatches({
      currentUserId: "me",
      wishedBooks: [
        book({ id: "wish-1", userId: "me", type: "WISHED", title: "Coracao de Leao", author: "Ana Reis" }),
        book({ id: "wish-2", userId: "me", type: "WISHED", title: "Duna", author: "Frank Herbert" }),
      ],
      books: [
        book({ id: "offered-1", userId: "near", ownerId: "near", title: "Coração de Leão", author: "Ana Reis" }),
        book({ id: "offered-2", userId: "near", ownerId: "near", title: "Duna", author: "Frank Herbert" }),
        book({ id: "self", userId: "me", title: "Duna", author: "Frank Herbert" }),
        book({ id: "wrong-author", userId: "other", title: "Duna", author: "Outro Autor" }),
        book({ id: "removed", userId: "other", status: "removed" }),
        book({ id: "wanted", userId: "other", type: "WISHED" }),
      ],
      profiles: new Map([
        ["near", { displayName: "Pessoa próxima", city: "São Paulo", state: "SP", latitude: -23.56, longitude: -46.64 }],
        ["other", { displayName: "Outro", city: "Rio", state: "RJ" }],
      ]),
      currentProfile,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].userId).toBe("near");
    expect(matches[0].books).toHaveLength(2);
  });

  it("ordena por coordenadas e usa cidade/estado como fallback", () => {
    const matches = findUserMatches({
      currentUserId: "me",
      wishedBooks: [book({ userId: "me", type: "WISHED" })],
      books: [
        book({ id: "distant", userId: "distant" }),
        book({ id: "same-state", userId: "state" }),
        book({ id: "same-city", userId: "city" }),
      ],
      profiles: new Map([
        ["distant", { displayName: "Distante", city: "Recife", state: "PE", latitude: -8.05, longitude: -34.9 }],
        ["state", { displayName: "Mesmo estado", city: "Campinas", state: "SP" }],
        ["city", { displayName: "Mesma cidade", city: "Sao Paulo", state: "SP" }],
      ]),
      currentProfile,
    });

    expect(matches.map((match) => match.userId)).toEqual(["distant", "city", "state"]);
  });

  it("não inclui candidatos sem match ou sem perfil", () => {
    const matches = findUserMatches({
      currentUserId: "me",
      wishedBooks: [book({ userId: "me", type: "WISHED" })],
      books: [
        book({ id: "no-match", userId: "no-match", title: "Outro livro" }),
        book({ id: "no-profile", userId: "no-profile" }),
      ],
      profiles: new Map([["no-match", { displayName: "Sem match", city: "", state: "" }]]),
      currentProfile: { displayName: "Eu", city: "", state: "" },
    });

    expect(matches).toEqual([]);
  });
});
