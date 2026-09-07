"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import LocationInput from "@/components/LocationInput";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { ProfileBook } from "@/lib/types";

type BookTab = "OFFERED" | "WISHED";

export default function ProfilePage() {
  const { user, profile, loading, updateUserProfile, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<BookTab>("OFFERED");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [location, setLocation] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [books, setBooks] = useState<ProfileBook[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "books"), where("userId", "==", user.uid)), (snapshot) => {
      setBooks(snapshot.docs.map((book) => ({ id: book.id, ...book.data() }) as ProfileBook));
    });
  }, [user]);

  const openEditor = () => {
    setName(profile?.displayName || "");
    setCity(profile?.city || "");
    setState(profile?.state || "");
    setLocation(profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : "");
    setFormError("");
    setNotice("");
    setEditing(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setNotice("");
    if (!name.trim() || !city || !state) {
      setFormError("Nome, cidade e estado são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({ displayName: name.trim(), city, state });
      setNotice("Perfil atualizado com sucesso!");
      setEditing(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || !user) return <div className="grid min-h-screen place-items-center">Carregando...</div>;
  const locationLabel = profile?.city && profile?.state ? `${profile.city} — ${profile.state}` : "Localização não informada";
  const listLabel = tab === "OFFERED" ? "ofertados" : "desejados";
  const selectedBooks = books.filter((book) => book.type === tab);

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-800">Matchbook</p><h1 className="text-3xl font-bold">Meu perfil</h1></div>
          <div className="flex gap-3"><button onClick={openEditor} className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">Editar perfil</button><button onClick={handleSignOut} className="rounded-md border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-100">Sair</button></div>
        </header>
        {notice && <p role="status" className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {editing ? (
          <form noValidate onSubmit={save} className="mt-6 max-w-xl space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Editar dados pessoais</h2>{formError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <div><label htmlFor="profile-name" className="block text-sm font-medium">Nome</label><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium">Cidade e estado</label><LocationInput value={location} onChange={(value, selected) => { setLocation(value); setCity(selected?.city || ""); setState(selected?.stateCode || ""); }} /><p className="mt-1 text-xs text-stone-500">Escolha uma opção sugerida para validar a localização.</p></div>
            <div className="flex gap-3"><button disabled={saving} className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button><button type="button" onClick={() => setEditing(false)} className="rounded-md px-4 py-2 text-stone-700 hover:bg-stone-100">Cancelar</button></div>
          </form>
        ) : <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">{profile?.displayName || user.displayName || "Leitor(a)"}</h2><p className="mt-2 text-stone-600">{locationLabel}</p></section>}
        <section className="mt-8"><h2 className="text-2xl font-bold">Seus livros</h2><div className="mt-4 flex border-b border-stone-200"><button onClick={() => setTab("OFFERED")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "OFFERED" ? "border-emerald-700 text-emerald-800" : "border-transparent text-stone-600"}`}>Livros Ofertados</button><button onClick={() => setTab("WISHED")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "WISHED" ? "border-emerald-700 text-emerald-800" : "border-transparent text-stone-600"}`}>Livros Desejados</button></div>{selectedBooks.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{selectedBooks.map((book) => <article key={book.id} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3"><div className="grid h-16 w-12 shrink-0 place-items-center rounded bg-emerald-100 text-xl" style={book.coverUrl ? { backgroundImage: `url(${book.coverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} aria-label={book.coverUrl ? `Capa de ${book.title}` : undefined}>{book.coverUrl ? null : "📚"}</div><div><h3 className="font-semibold">{book.title}</h3><p className="text-sm text-stone-600">{book.author}</p></div></article>)}</div> : <p className="mt-5 rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">Você ainda não possui livros {listLabel} nesta lista.</p>}</section>
      </div>
    </main>
  );
}
