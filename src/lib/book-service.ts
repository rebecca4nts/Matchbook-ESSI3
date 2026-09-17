import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/** Tipo canônico do Firestore (Cenário 4.1). */
export type BookType = "OFFERED" | "WISHED";
export type BookStatus = "available" | "removed";

export interface Book {
  id: string;
  /** Dono da obra (campo canônico do Cenário 4.1). */
  userId: string;
  /**
   * Espelho de `userId` mantido para compatibilidade com as regras
   * e consultas que usam `ownerId`.
   */
  ownerId: string;
  title: string;
  author: string;
  genre: string;
  coverUrl: string;
  type: BookType;
  status: BookStatus;
  createdAt: string;
  googleId?: string;
  description?: string;
}

export interface BookCreateInput {
  userId: string;
  title: string;
  author: string;
  genre: string;
  type: BookType;
  coverUrl?: string;
  googleId?: string;
  description?: string;
}

export interface BookFieldErrors {
  title?: string;
  author?: string;
  genre?: string;
}

/** Erro de validação (Cenário 2.1): impede o envio e indica os campos. */
export class BookValidationError extends Error {
  fields: BookFieldErrors;
  constructor(fields: BookFieldErrors) {
    super("Verifique os campos obrigatórios.");
    this.name = "BookValidationError";
    this.fields = fields;
  }
}

const BOOKS_COLLECTION = "books";

/** Aceita docs legados (`offered`/`wanted`, `ownerId`) e normaliza. */
export function normalizeBookType(type: unknown): BookType {
  if (type === "OFFERED" || type === "offered") return "OFFERED";
  if (type === "WISHED" || type === "wanted") return "WISHED";
  throw new Error(`Tipo de livro inválido: ${String(type)}`);
}

function toBook(id: string, data: Record<string, unknown>): Book {
  const ownerId = typeof data.ownerId === "string" ? data.ownerId : "";
  const userId =
    typeof data.userId === "string" ? data.userId : ownerId;
  return {
    id,
    userId,
    ownerId: ownerId || userId,
    title: typeof data.title === "string" ? data.title : "",
    author: typeof data.author === "string" ? data.author : "",
    genre: typeof data.genre === "string" ? data.genre : "",
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : "",
    type: normalizeBookType(data.type),
    status: data.status === "removed" ? "removed" : "available",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    ...(typeof data.googleId === "string" ? { googleId: data.googleId } : {}),
    ...(typeof data.description === "string"
      ? { description: data.description }
      : {}),
  };
}

/** Valida os campos obrigatórios (Cenário 2.1). */
export function validateBookInput(
  input: Pick<BookCreateInput, "title" | "author" | "genre">
): void {
  const fields: BookFieldErrors = {};
  if (!input.title.trim()) fields.title = "Título é obrigatório.";
  if (!input.author.trim()) fields.author = "Autor é obrigatório.";
  if (!input.genre.trim()) fields.genre = "Gênero é obrigatório.";
  if (Object.keys(fields).length > 0) {
    throw new BookValidationError(fields);
  }
}

/**
 * Cadastra um livro na coleção `books` (Cenários 1.1, 1.2 e 4.1).
 * Persiste obrigatoriamente: userId, title, author, genre,
 * type ("OFFERED" | "WISHED") e createdAt.
 */
export async function addBook(input: BookCreateInput): Promise<Book> {
  validateBookInput(input);
  if (!input.userId) {
    throw new Error("Usuário não autenticado.");
  }
  normalizeBookType(input.type);

  const payload = {
    userId: input.userId,
    ownerId: input.userId,
    title: input.title.trim(),
    author: input.author.trim(),
    genre: input.genre.trim(),
    type: input.type,
    coverUrl: input.coverUrl ?? "",
    status: "available" as const,
    createdAt: new Date().toISOString(),
    ...(input.googleId ? { googleId: input.googleId } : {}),
    ...(input.description ? { description: input.description } : {}),
  };

  const ref = await addDoc(collection(db, BOOKS_COLLECTION), payload);
  return { id: ref.id, ...payload };
}

/**
 * Busca todos os livros de um usuário.
 * A remoção física (deleteDoc) garante que o livro deixe de ser
 * retornado nas buscas globais.
 */
export async function getUserBooks(uid: string): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("ownerId", "==", uid)
  );
  const snapshot = await getDocs(q);
  const books: Book[] = snapshot.docs.map((d) =>
    toBook(d.id, d.data() as Record<string, unknown>)
  );

  books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return books;
}

/**
 * Remove um livro da coleção `books`.
 * A autorização é garantida pelas regras do Firestore:
 * `allow delete: if request.auth.uid == resource.data.ownerId`.
 */
export async function removeBook(bookId: string): Promise<void> {
  await deleteDoc(doc(db, BOOKS_COLLECTION, bookId));
}
