"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Fraunces, Inter } from "next/font/google";
import { User, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RuledField } from "@/components/auth/RuledField";
import { RuledSelect } from "@/components/auth/RuledSelect";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

interface Estado {
  sigla: string;
  nome: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");

  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Redireciona se deslogado
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Carrega Estados do IBGE
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: Estado[]) => setEstados(data.map((e) => ({ sigla: e.sigla, nome: e.nome })) ))
      .catch(() => setErro("Erro ao carregar lista de estados."));
  }, []);

  // Carrega Perfil Atual do Firestore
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const fallbackDisplayName = user.displayName ?? "";
    async function loadUserData() {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNome(data.displayName || fallbackDisplayName || "");
          if (data.location) {
            const [cit, stateSigla] = data.location.split(", ");
            if (stateSigla) setUf(stateSigla);
            if (cit) setCidade(cit);
          }
        }
      } catch (err) {
        setErro("Não foi possível obter seus dados atuais.");
      } finally {
        setInitialLoading(false);
      }
    }
    loadUserData();
  }, [user]);

  // Carrega Cidades conforme Estado selecionado
  useEffect(() => {
    if (!uf) {
      setCidades([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((res) => res.json())
      .then((data: { nome: string }[]) => setCidades(data.map((c) => c.nome)))
      .catch(() => setErro("Erro ao carregar cidades."));
  }, [uf]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const uid = user.uid;
    if (!nome.trim() || !uf || !cidade) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    setSubmitting(true);
    setErro(null);

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        displayName: nome.trim(),
        location: `${cidade}, ${uf}`,
      });
      router.push("/profile");
    } catch (err) {
      setErro("Ocorreu um erro ao atualizar o perfil.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || initialLoading) {
    return null;
  }

  return (
    <div
      className={`${inter.className} min-h-screen w-full flex items-center justify-center px-5 py-10`}
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-[13px] mb-4 text-[#EDE6D6]/60 hover:text-[#EDE6D6] transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao perfil
        </Link>

        {/* Ficha catalográfica do Formulário */}
        <div
          className="rounded-[3px] px-6 pt-6 pb-7 relative overflow-hidden shadow-xl"
          style={{
            background: "#EDE6D6",
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(27,37,48,0.06) 28px)",
          }}
        >
          <div className="absolute top-3 right-4 w-2.5 h-2.5 rounded-full bg-[#1B2530]/10" />

          <h2 className={`${fraunces.className} text-[22px] text-[#1B2530] mb-6`}>
            Editar Perfil
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <RuledField
              label="Nome"
              icon={User}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome exibido"
            />

            <RuledSelect
              label="Estado"
              icon={MapPin}
              value={uf}
              onChange={(e) => {
                setUf(e.target.value);
                setCidade("");
              }}
              options={estados.map((e) => ({ value: e.sigla, label: e.nome }))}
              placeholder="Selecione o estado"
            />

            <RuledSelect
              label="Cidade"
              icon={MapPin}
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              options={cidades.map((c) => ({ value: c, label: c }))}
              placeholder={!uf ? "Selecione o estado primeiro" : "Selecione a cidade"}
              disabled={!uf}
            />

            {erro && <p className="text-[13px] leading-snug text-[#8C3B2E]">{erro}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 mt-2 rounded-[2px] text-[15px] font-medium transition-transform active:scale-[0.98] disabled:opacity-60 text-[#EDE6D6]"
              style={{ background: "#8C3B2E" }}
            >
              {submitting ? "Salvando..." : "Salvar Alterações"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
