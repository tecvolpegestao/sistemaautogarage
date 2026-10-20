import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-screen flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <img src="/brand/logo-yellow.png" alt="Autogarage" className="mb-6 h-10 w-auto" />
      <h1 className="display text-4xl">Página não encontrada</h1>
      <Link href="/painel" className="mt-6 text-sm font-semibold text-[#FDC307] underline">
        Voltar ao painel
      </Link>
    </main>
  );
}
