# **NeoLog**

## **Visão Geral**

O **NeoLog** é um sistema interno projetado para digitalizar e otimizar o fluxo de trabalho de solicitação de itens entre os setores de **Expedição** e **Galpão** de uma empresa. Ele substitui um processo manual baseado em papel por uma interface web eficiente, rápida e rastreável. A aplicação permite que os usuários criem, visualizem e gerenciem solicitações em tempo real, melhorando a comunicação e a produtividade.

## **Funcionalidades**

* **Criação de Solicitações:** O setor de Expedição pode criar novas solicitações de itens de forma simples e intuitiva.  
* **Gerenciamento de Pedidos:** O setor de Galpão pode visualizar todas as solicitações pendentes e alterar o status (por exemplo, "Em Análise", "Em Preparação", "Finalizado").  
* **Status em Tempo Real:** Graças ao **Supabase**, as atualizações nas solicitações são mostradas em tempo real para todos os usuários, eliminando a necessidade de recarregar a página.  
* **Rastreamento:** Todas as solicitações são registradas no banco de dados, permitindo um histórico completo e a rastreabilidade dos pedidos.  
* **Interface Responsiva:** O design, construído com **Tailwind CSS**, é adaptável a diferentes tamanhos de tela.

## **Tecnologias**

* **Frontend:**  
  * **React:** Biblioteca para a construção da interface de usuário.  
  * **Vite:** Ferramenta de build rápida e eficiente para desenvolvimento.  
  * **TypeScript:** Linguagem para garantir tipagem estática e um código mais robusto.  
  * **Tailwind CSS:** Framework de CSS para design rápido e customizável.  
* **Backend & Banco de Dados:**  
  * **Supabase:** Plataforma de código aberto que oferece um banco de dados **PostgreSQL**, autenticação, e funcionalidades de tempo real (realtime).

## **Como Executar o Projeto**

Siga os passos abaixo para ter o projeto rodando em seu ambiente de desenvolvimento.

### **1\. Pré-requisitos**

* **Node.js:** Certifique-se de ter o Node.js instalado (versão 18 ou superior é recomendada).  
* **Git:** Para clonar o repositório.

### **2\. Configuração do Ambiente**

**Clone o repositório:**  
Bash  
git clone https://github.com/MatheusFarias15/NeoLog.git  
cd NeoLog

1. 

**Instale as dependências:**  
Bash  
npm install

2.   
3. **Configure o Supabase:**  
   * Crie um novo projeto no Supabase.  
   * Crie uma tabela `pedidos` com as colunas necessárias (`id`, `item`, `quantidade`, `status`, `criado_em`, etc.).  
   * Habilite a **Row Level Security (RLS)** e as políticas necessárias.  
   * Na pasta raiz do seu projeto, crie um arquivo `.env` com as seguintes variáveis de ambiente, substituindo pelos seus dados do Supabase:

Snippet de código  
VITE\_SUPABASE\_URL="SUA\_URL\_AQUI"  
VITE\_SUPABASE\_ANON\_KEY="SUA\_CHAVE\_ANON\_AQUI"

4. 

### **3\. Executando a Aplicação**

Para iniciar o servidor de desenvolvimento, execute o seguinte comando:

Bash  
npm run dev

A aplicação estará disponível em `http://localhost:5173`.

## **Deploy (Vercel)**

Este projeto foi projetado para ser facilmente implantado na **Vercel**.

1. Conecte seu repositório GitHub à sua conta Vercel.  
2. Configure as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) no painel de configurações do projeto na Vercel.  
3. O processo de build será executado automaticamente.

