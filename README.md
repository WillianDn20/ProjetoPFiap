# Projeto FIAP — Plataforma escolar

Sistema escolar com site web, aplicativo mobile e API compartilhada. O site e o aplicativo utilizam o mesmo backend e banco MongoDB.

## Requisitos

- Node.js 22.13.x, 24.3+ ou 26+ e npm.
- Docker Desktop com Docker Compose.
- Acesso à internet para baixar dependências, imagens do Docker e feriados nacionais no calendário.

### Iniciando o Banco de Dados e o Back-end
Abra o terminal, navegue até a pasta do Back-end e execute os seguintes comandos:

1. Suba o contêiner do banco de dados (MongoDB): Bash
```bash
docker-compose up -d
```

1. Instale as dependências da API: Bash
```bash
npm install
```

1. Inicie o servidor Back-end: Bash
```bash
npm start
```

2. Iniciando o Front-end

Com o back-end rodando, abra a pasta do Front-end e execute no novo terminal:

1. Instale as dependências do React: Bash
```bash
npm install
```

1. Inicie o servidor de desenvolvimento: Bash
```bash
npm run dev
```

3. Iniciando o Mobile

Com o back-end rodando, abra a pasta do mobile, localizada dentro do front e execute no novo terminal do mobile:

Instale as dependências do React: Bash

```bash
npm install
```

## Arquitetura da aplicação

O repositório contém três componentes principais:

- **Site web — `FrontTCFiap-main/`:** interface React com componentes funcionais e Hooks, roteamento pelo React Router e estilização com Styled Components. O cliente HTTP usa Axios para consumir a API REST.
- **Aplicativo mobile — `FrontTCFiap-main/mobile/`:** aplicativo React Native executado com Expo, com navegação por abas e telas. O Context API mantém o estado de autenticação e o AsyncStorage persiste a sessão do professor no dispositivo. O Axios acessa a mesma API do site. Imagens escolhidas para postagens são redimensionadas e compactadas antes do envio.
- **Backend e dados — `BackFiap-main/`:** API REST em Node.js e Express, com persistência MongoDB via Mongoose. O Docker Compose configura o contêiner MongoDB e um volume persistente para os dados.

As operações administrativas são protegidas no backend e exigem autenticação de professor. Conteúdo público, como a consulta de postagens, avisos e calendário, é fornecido pela mesma API. O Expo Go é uma opção de desenvolvimento, não um requisito para o projeto.

## Guia de uso do aplicativo mobile

### Acesso público

- **Postagens:** consulte e busque publicações; abra uma postagem para ler o conteúdo, ver imagens e comentários. Visitantes podem enviar comentários, identificados como “Visitante”.
- **Calendário:** navegue entre meses, selecione uma data e consulte eventos escolares e feriados nacionais.
- **Avisos:** consulte os avisos publicados.

### Acesso de professor

Login: professor@tc4.fiap
Senha: 12345678

Entre com uma conta de professor para acessar as funções administrativas:

- Criar, editar e excluir postagens, com imagem de capa e até três imagens anexadas.
- Publicar e excluir avisos; criar e excluir eventos do calendário.
- Cadastrar e gerenciar professores e alunos na área **Usuários**.
- Editar notas dos alunos por disciplina e bimestre, e consultar médias.
- Adicionar ou excluir observações vinculadas a um aluno.
- Excluir comentários e encerrar a sessão usando **Sair**.

Os alunos cadastrados no módulo escolar são perfis acadêmicos, não contas de login. A conta protegida `professor@tc4.fiap` não pode ser editada ou excluída pela interface.


```

