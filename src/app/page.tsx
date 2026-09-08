"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Fraunces, Inter } from "next/font/google";
import { Mail, Lock, Eye, EyeOff, MapPin, User } from "lucide-react";
import { Logomark } from "@/components/auth/Logomark";
import { RuledField } from "@/components/auth/RuledField";
import { RuledSelect } from "@/components/auth/RuledSelect";
import { useAuth } from "@/lib/auth-context";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Mode = "entrar" | "cadastrar";

interface FormState {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  uf: string;
  cidade: string;
}

interface Estado {
  sigla: string;
  nome: string;
}

const ERRO_FIREBASE: Record<string, string> = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
  "auth/wrong-password": "Senha incorreta.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Esse e-mail já está cadastrado.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/missing-password": "Digite uma senha.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
};

function mensagemDeErro(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && ERRO_FIREBASE[code]) return ERRO_FIREBASE[code];
  return "Ocorreu um erro. Tente novamente.";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("entrar");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<FormState>({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    uf: "",
    cidade: "",
  });

  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // se já está logado, não faz sentido ficar na tela de login
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // carrega a lista de estados uma vez, quando o modo cadastro é aberto
  useEffect(() => {
    if (mode !== "cadastrar" || estados.length > 0) return;
    let cancelado = false;
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: Estado[]) => {
        if (!cancelado) setEstados(data.map((e) => ({ sigla: e.sigla, nome: e.nome })));
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a lista de estados. Verifique sua conexão.");
      });
    return () => {
      cancelado = true;
    };
  }, [mode, estados.length]);

  // carrega as cidades do estado escolhido
  useEffect(() => {
    if (!form.uf) {
      setCidades([]);
      return;
    }
    let cancelado = false;
    setCarregandoCidades(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.uf}/municipios`)
      .then((res) => res.json())
      .then((data: { nome: string }[]) => {
        if (!cancelado) setCidades(data.map((c) => c.nome));
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as cidades desse estado.");
      })
      .finally(() => {
        if (!cancelado) setCarregandoCidades(false);
      });
    return () => {
      cancelado = true;
    };
  }, [form.uf]);

  const update =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleUfChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm((f) => ({ ...f, uf: e.target.value, cidade: "" }));
  };

  const handleCidadeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm((f) => ({ ...f, cidade: e.target.value }));
  };

  const trocarModo = (novoModo: Mode) => {
    setErro(null);
    setMode(novoModo);
  };

  const handleSubmit = async () => {
    setErro(null);

    if (!form.email || !form.senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    if (mode === "entrar") {
      setSubmitting(true);
      try {
        await signInWithEmail(form.email, form.senha);
        router.push("/dashboard");
      } catch (err) {
        setErro(mensagemDeErro(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // cadastro
    if (!form.nome.trim()) {
      setErro("Digite seu nome.");
      return;
    }
    if (!form.uf || !form.cidade) {
      setErro("Selecione o estado e a cidade.");
      return;
    }
    if (form.senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const estadoSelecionado = estados.find((e) => e.sigla === form.uf);
      await signUpWithEmail(form.email, form.senha, {
        displayName: form.nome.trim(),
        location: `${form.cidade}, ${estadoSelecionado?.sigla ?? form.uf}`,
      });
      router.push("/dashboard");
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`${inter.className} min-h-screen w-full flex items-center justify-center px-5 py-10`}
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="flex flex-col items-center mb-7">
          <Logomark />
          <h1
            className={`${fraunces.className} mt-3 text-[28px] leading-none`}
            style={{ color: "#EDE6D6" }}
          >
            Matchbook
          </h1>
          <p
            className="mt-2 text-[13.5px] text-center max-w-[240px] leading-snug"
            style={{ color: "rgba(237,230,214,0.6)" }}
          >
            Encontre quem quer o livro que você tem e tem o livro que você quer
          </p>
        </div>

        {/* Ficha catalográfica */}
        <div className="relative">
          {/* abas-marcadores */}
          <div className="flex px-1">
            {(
              [
                { key: "entrar", label: "Entrar" },
                { key: "cadastrar", label: "Criar conta" },
              ] as const
            ).map((tab) => {
              const active = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => trocarModo(tab.key)}
                  className="relative px-5 pt-2.5 pb-3 text-[14.5px] font-medium transition-colors"
                  style={{ color: active ? "#1B2530" : "rgba(237,230,214,0.5)" }}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute inset-0 -z-10 rounded-t-[3px]" style={{ background: "#EDE6D6" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* corpo do cartão */}
          <div
            className="rounded-b-[3px] rounded-tr-[3px] px-6 pt-6 pb-7 relative overflow-hidden"
            style={{
              background: "#EDE6D6",
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(27,37,48,0.06) 28px)",
            }}
          >
            {/* furo de arquivo, referência sutil à ficha física */}
            <div className="absolute top-3 right-4 w-2.5 h-2.5 rounded-full bg-[#1B2530]/10" />

            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              {mode === "cadastrar" && (
                <RuledField
                  label="Nome"
                  icon={User}
                  value={form.nome}
                  onChange={update("nome")}
                  placeholder="Como podemos te chamar"
                />
              )}

              <RuledField
                label="E-mail"
                type="email"
                icon={Mail}
                value={form.email}
                onChange={update("email")}
                placeholder="voce@email.com"
              />

              {mode === "cadastrar" && (
                <>
                  <RuledSelect
                    label="Estado"
                    icon={MapPin}
                    value={form.uf}
                    onChange={handleUfChange}
                    options={estados.map((e) => ({ value: e.sigla, label: e.nome }))}
                    placeholder={estados.length ? "Selecione o estado" : "Carregando estados..."}
                  />
                  <RuledSelect
                    label="Cidade"
                    icon={MapPin}
                    value={form.cidade}
                    onChange={handleCidadeChange}
                    options={cidades.map((c) => ({ value: c, label: c }))}
                    placeholder={
                      !form.uf
                        ? "Selecione o estado primeiro"
                        : carregandoCidades
                        ? "Carregando cidades..."
                        : "Selecione a cidade"
                    }
                    disabled={!form.uf || carregandoCidades}
                  />
                </>
              )}

              <RuledField
                label="Senha"
                type={showPw ? "text" : "password"}
                icon={Lock}
                value={form.senha}
                onChange={update("senha")}
                placeholder="Mínimo de 6 caracteres"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-[#1B2530]/40 hover:text-[#1B2530]/70 transition-colors"
                    aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {mode === "cadastrar" && (
                <RuledField
                  label="Confirmar senha"
                  type={showPw ? "text" : "password"}
                  icon={Lock}
                  value={form.confirmarSenha}
                  onChange={update("confirmarSenha")}
                  placeholder="Repita a senha"
                />
              )}

              {mode === "entrar" && (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    className="text-[12.5px] text-[#5C6B4F] hover:text-[#8C3B2E] transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {erro && (
                <p className="text-[13px] leading-snug" style={{ color: "#8C3B2E" }}>
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 mt-1 rounded-[2px] text-[15px] font-medium transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{ color: "#EDE6D6", background: "#8C3B2E" }}
              >
                {submitting
                  ? mode === "entrar"
                    ? "Entrando..."
                    : "Criando conta..."
                  : mode === "entrar"
                  ? "Entrar"
                  : "Criar conta"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: "rgba(237,230,214,0.5)" }}>
          {mode === "entrar" ? (
            <>
              Ainda não tem conta?{" "}
              <button
                onClick={() => trocarModo("cadastrar")}
                className="underline underline-offset-2 transition-colors"
                style={{ color: "rgba(237,230,214,0.9)" }}
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => trocarModo("entrar")}
                className="underline underline-offset-2 transition-colors"
                style={{ color: "rgba(237,230,214,0.9)" }}
              >
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

