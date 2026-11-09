"use client";

import { useState, type ChangeEvent } from "react";
import { Fraunces, Inter } from "next/font/google";
import { Mail, Lock, Eye, EyeOff, MapPin, User } from "lucide-react";
import { Logomark } from "@/components/auth/Logomark";
import { RuledField } from "@/components/auth/RuledField";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Mode = "entrar" | "cadastrar";

interface FormState {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  cidade: string;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<FormState>({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    cidade: "",
  });

  const update =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

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
                  onClick={() => setMode(tab.key)}
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

            <div className="space-y-5">
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
                <RuledField
                  label="Cidade e estado"
                  icon={MapPin}
                  value={form.cidade}
                  onChange={update("cidade")}
                  placeholder="Recife, PE"
                />
              )}

              <RuledField
                label="Senha"
                type={showPw ? "text" : "password"}
                icon={Lock}
                value={form.senha}
                onChange={update("senha")}
                placeholder="Mínimo de 8 caracteres"
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
                  <button className="text-[12.5px] text-[#5C6B4F] hover:text-[#8C3B2E] transition-colors">
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <button
                className="w-full py-3 mt-1 rounded-[2px] text-[15px] font-medium transition-transform active:scale-[0.98]"
                style={{ color: "#EDE6D6", background: "#8C3B2E" }}
              >
                {mode === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: "rgba(237,230,214,0.5)" }}>
          {mode === "entrar" ? (
            <>
              Ainda não tem conta?{" "}
              <button
                onClick={() => setMode("cadastrar")}
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
                onClick={() => setMode("entrar")}
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
