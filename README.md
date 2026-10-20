# Autogarage

Sistema da oficina para acompanhar cada carro do orçamento até o pagamento, com custo e lucro visíveis só para o dono e o financeiro.

Esta entrega é a **fase 1, operação básica**:

- Login com os perfis dono, atendimento, produção e financeiro
- Clientes e veículos, com alerta se o telefone ou a placa já existem
- Orçamento e ordem de serviço, com situação do serviço e situação do pagamento independentes
- Custo da peça digitado na OS, preço sugerido pela margem e lucro da OS
- Recebimentos em Pix, dinheiro ou cartão, inclusive em partes e parcelado
- Painel da semana, da quinzena e do mês
- Documento para o cliente em PDF (impressão), JPEG e resumo para WhatsApp

Ficam para as próximas fases o estoque com baixa automática, o fechamento semanal dos parceiros e a exportação para a Conta Azul. O cliente do tipo Parceiro já pode ser marcado, para o fechamento usar essa base depois.

## Como rodar

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`.

Acessos de demonstração, senha `oficina`:

| Perfil | E-mail |
| --- | --- |
| Dono | victor@autogarage.com |
| Atendimento | ana@autogarage.com |
| Produção | diego@autogarage.com |
| Financeiro | paula@autogarage.com |

Troque a senha e o `AUTH_SECRET` antes de usar com dados reais. CNPJ e chave Pix ficam em Configurações.

## Conta do lucro

Lucro da OS = total cobrado − custo das peças. O custo fica gravado na OS. O salário do mecânico ainda não entra, porque esse ponto segue em aberto.
