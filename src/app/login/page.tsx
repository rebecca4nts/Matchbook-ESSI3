"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import LocationInput from "@/components/LocationInput";

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
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user, loading: authLoading } = useAuth();
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
    else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) nextErrors.email = "Por favor, insira um e-mail válido";
    if (!password) nextErrors.password = "Senha é obrigatória.";
    if (isSignUp) {
      if (!name.trim()) nextErrors.name = "Nome é obrigatório.";
      if (!city || !state || !location) nextErrors.location = "Selecione uma cidade e estado da lista.";
      if (password && (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(password) || password.length < 8)) {
        nextErrors.password = "A senha deve ter pelo menos 8 caracteres, letra, número e caractere especial.";
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(normalizedEmail, password, { displayName: name.trim(), city, state });
      } else {
        await signInWithEmail(normalizedEmail, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Um erro inesperado aconteceu!");
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
      setError(err instanceof Error ? err.message : "Um erro inesperado aconteceu!");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return <div className="grid min-h-screen place-items-center bg-gray-50 text-gray-700">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {isSignUp ? "Criar conta" : "Entrar"}
        </h1>

        {error && (
          <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Localização
                </label>
                <LocationInput
                  value={location}
                  onChange={(value, selectedLocation) => {
                    setLocation(value);
                    setCity(selectedLocation?.city || "");
                    setState(selectedLocation?.stateCode || "");
                    setFieldErrors((current) => ({ ...current, location: "" }));
                  }}
                />
                {fieldErrors.location && <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>}
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                if (isSignUp && password && (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(password) || password.length < 8)) {
                  setFieldErrors((current) => ({ ...current, password: "A senha deve ter pelo menos 8 caracteres, letra, número e caractere especial." }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {isSignUp && <p className="mt-1 text-xs text-gray-500">Use ao menos 8 caracteres, incluindo letra, número e caractere especial.</p>}
            {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Carregando..." : isSignUp ? "Cadastrar" : "Entrar"}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
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

        <p className="mt-4 text-center text-sm text-gray-600">
          {isSignUp ? "Já possui uma conta?" : "Não possui uma conta?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setFieldErrors({});
            }}
            className="text-blue-600 transition-colors hover:text-blue-800 hover:underline"
          >
            {isSignUp ? "Entrar" : "Cadastrar-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
