import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-screen flex items-center justify-center px-4 py-10">
      <div className="login-card w-full max-w-md rounded-lg p-8">
        <img src="/brand/logo-yellow.png" alt="Autogarage" className="h-10 w-auto" />
        <h1 className="display mt-6 text-3xl">Entrar</h1>
        <p className="mb-6 mt-2 text-sm text-[#A3A3A3]">Acompanhe cada carro, do orçamento ao pagamento.</p>
        <LoginForm />
      </div>
    </main>
  );
}
