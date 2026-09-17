import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type BookType = "offered" | "wanted";
export type BookStatus = "available" | "removed";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  ownerId: string;
  type: BookType;
  status: BookStatus;
  createdAt: string;
}

const BOOKS_COLLECTION = "books";

/**
 * Busca todos os livros de um usuário.
 * A remoção física (deleteDoc) garante o Cenário 3.1:
 * o livro deixa de ser retornado nas buscas globais.
 */
export async function getUserBooks(uid: string): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("ownerId", "==", uid)
  );
  const snapshot = await getDocs(q);
  const books: Book[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Book, "id">),
  }));

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
