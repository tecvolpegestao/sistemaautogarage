"use client";

import { useActionState } from "react";
import { createClient } from "@/server/actions/clients";
import { Field, buttonClass, inputClass } from "@/components/ui";

export function ClientForm() {
  const [state, action, pending] = useActionState(createClient, null);
  return (
    <form action={action} className="space-y-4 rounded-lg border border-line bg-card p-4">
      <Field label="Nome">
        <input name="name" required className={inputClass()} />
      </Field>
      <Field label="Telefone">
        <input name="phone" required className={inputClass()} placeholder="(11) 98888-0000" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail">
          <input name="email" type="email" className={inputClass()} />
        </Field>
        <Field label="CPF ou CNPJ">
          <input name="document" className={inputClass()} />
        </Field>
      </div>
      <Field label="Tipo">
        <select name="type" className={inputClass()} defaultValue="INDIVIDUAL">
          <option value="INDIVIDUAL">Particular</option>
          <option value="PARTNER">Parceiro</option>
        </select>
      </Field>
      <Field label="Observações">
        <textarea name="notes" className={`${inputClass()} h-24 py-2`} />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className={buttonClass()} disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar cliente"}
      </button>
    </form>
  );
}
