# 📚 Matchbook

> **Conectando leitores e promovendo a economia circular literária.**

O **Matchbook** é uma plataforma web desenvolvida para facilitar a troca de livros físicos entre usuários de forma prática, gratuita e geograficamente próxima. Através de um algoritmo de compatibilidade simples, o sistema identifica quando o livro oferecido por um leitor é o desejo de outro e vice-versa, gerando um *match* de interesses.

---

## 👥 Equipe de Desenvolvimento

Projeto desenvolvido para a disciplina de **Engenharia de Software para Sistemas de Informação III** (BSI - UFRPE):

* **Kayo Vinicius**
* **Rebecca Antunes**
* **Ryan Batista**
* **Edney Santos**

---

## 🚀 Funcionalidades Principais (MVP - Release 1)

* **Autenticação de Usuários:** Cadastro, login e gestão de perfil simples com localização (Cidade/Estado).
* **Gestão de Acervo:** Cadastro de obras disponíveis para troca ("Ofereço") e livros desejados ("Quero"), com detalhamento do estado de conservação.
* **Sistema de Match:** Cruzamento automático de interesses entre leitores da mesma região.
* **Envio de Propostas:** Liberação de dados de contato após o match para combinação da entrega física presencial.
---

## 🛠️ Stack Tecnológica

* **Frontend:** Next.js / React + Tailwind CSS (com apoio visual do Plasmic)
* **Backend & Banco de Dados:** Firebase (Authentication & Firestore)
* **Versionamento & Gestão:** GitHub & Jira Software
* **Hospedagem:** Vercel

---

## 💻 Como Rodar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone [git@github.com:rebecca4nts/Matchbook-ESSI3.git](https://github.com/rebecca4nts/Matchbook-ESSI3.git)
   cd Matchbook-ESSI3
   ```

2. **Instale as Dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.local` fornecido pelo time e cole na raiz do projeto. Ele contém as credenciais do Firebase necessárias para o funcionamento da aplicação.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação:**
   Acesse [http://localhost:3000](http://localhost:3000) no navegador.
