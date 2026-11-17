# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# FrontTCFiap

## Gestão de usuários

Professores autenticados podem acessar **Usuários** pela navegação do site ou diretamente em `/usuarios`. A página lista e pagina contas de professores e cadastros escolares de alunos. A criação e edição dos cadastros abrem páginas próprias. Professores têm disciplina; alunos não têm login nem notas no formulário. Endereço e contatos ficam na seção de responsáveis; para salvar um aluno, são obrigatórios nome, ano escolar, endereço e pelo menos um responsável com telefone ou e-mail. Na lista, **Editar notas e observações** abre a tabela do ano atual, com média exibida e aprovação a partir de 6,0 somente após os quatro bimestres, e observações vinculadas ao aluno. A mesma gestão está no menu do app em `mobile`, disponível após o login de professor.
