"use client";

import LocationInput from "@/components/LocationInput";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    user,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nextErrors: Record<string, string> = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) nextErrors.email = "E-mail é obrigatório.";
    else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail))
      nextErrors.email = "Por favor, insira um e-mail válido";
    if (!password) nextErrors.password = "Senha é obrigatória.";
    if (isSignUp) {
      if (!name.trim()) nextErrors.name = "Nome é obrigatório.";
      if (!city || !state || !location)
        nextErrors.location = "Selecione uma cidade e estado da lista.";
      if (
        password &&
        (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(password) ||
          password.length < 8)
      ) {
        nextErrors.password =
          "A senha deve ter pelo menos 8 caracteres, letra, número e caractere especial.";
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(normalizedEmail, password, {
          displayName: name.trim(),
          city,
          state,
        });
      } else {
        await signInWithEmail(normalizedEmail, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Um erro inesperado aconteceu!",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Um erro inesperado aconteceu!",
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <main
        className="grid min-h-screen place-items-center text-[#EDE6D6]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)",
        }}
      >
        Carregando...
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #24303F 0%, #1B2530 55%, #161E27 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#EDE6D6]/60">
            MATCHBOOK
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#EDE6D6]">
            {isSignUp ? "Criar conta" : "Entrar"}
          </h1>
          <p className="mt-2 text-sm text-[#EDE6D6]/65">
            Busque e encontre com quem trocar os seus livros.
          </p>
        </header>

        <section
          className="rounded-b-[3px] rounded-tr-[3px] px-6 py-7 sm:px-8"
          style={{
            background: "#EDE6D6",
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(27,37,48,0.06) 28px)",
          }}
        >
          <h2 className="mb-5 text-center text-xl font-semibold text-[#1B2530]">
            {isSignUp ? "Seja bem-vindo" : "Acesse sua conta"}
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-[2px] border border-[#8C3B2E]/20 bg-[#8C3B2E]/10 p-3 text-sm text-[#762F25]"
            >
              {error}
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[#1B2530]"
                  >
                    Nome
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.name)}
                    className="mt-1 block min-h-11 w-full rounded-[2px] border border-[#1B2530]/20 bg-white/70 px-3 py-2 text-base text-[#1B2530] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-sm text-[#8C3B2E]">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-[#1B2530]"
                  >
                    Localização
                  </label>
                  <LocationInput
                    value={location}
                    onChange={(value, selectedLocation) => {
                      setLocation(value);
                      setCity(selectedLocation?.city || "");
                      setState(selectedLocation?.stateCode || "");
                      setFieldErrors((current) => ({
                        ...current,
                        location: "",
                      }));
                    }}
                  />
                  {fieldErrors.location && (
                    <p className="mt-1 text-sm text-[#8C3B2E]">
                      {fieldErrors.location}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#1B2530]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((current) => ({ ...current, email: "" }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                className="mt-1 block min-h-11 w-full rounded-[2px] border border-[#1B2530]/20 bg-white/70 px-3 py-2 text-base text-[#1B2530] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-[#8C3B2E]">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1B2530]"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((current) => ({ ...current, password: "" }));
                }}
                onBlur={() => {
                  if (
                    isSignUp &&
                    password &&
                    (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(
                      password,
                    ) ||
                      password.length < 8)
                  ) {
                    setFieldErrors((current) => ({
                      ...current,
                      password:
                        "A senha deve ter pelo menos 8 caracteres, letra, número e caractere especial.",
                    }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                className="mt-1 block min-h-11 w-full rounded-[2px] border border-[#1B2530]/20 bg-white/70 px-3 py-2 text-base text-[#1B2530] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
              />
              {isSignUp && (
                <p className="mt-1 text-xs text-[#1B2530]/65">
                  Use ao menos 8 caracteres, incluindo letra, número e caractere
                  especial.
                </p>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-[#8C3B2E]">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-[2px] bg-[#8C3B2E] px-4 py-2 font-medium text-[#EDE6D6] transition-colors hover:bg-[#762F25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2530] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Carregando..." : isSignUp ? "Cadastrar" : "Entrar"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[#1B2530]/55">
            <span className="h-px flex-1 bg-[#1B2530]/15" />
            <span>ou</span>
            <span className="h-px flex-1 bg-[#1B2530]/15" />
          </div>
          <div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[2px] border border-[#1B2530]/20 bg-white/70 px-4 py-2 text-[#1B2530] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E] disabled:cursor-wait disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue com Google
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-[#1B2530]/70">
            {isSignUp ? "Já possui uma conta?" : "Não possui uma conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setFieldErrors({});
              }}
              className="font-semibold text-[#8C3B2E] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C3B2E]"
            >
              {isSignUp ? "Entrar" : "Cadastrar-se"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
