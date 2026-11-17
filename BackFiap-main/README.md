# BackFiap

## Configuração

Configure as variáveis de ambiente antes de iniciar a API:

```env
MONGO_URI=mongodb://127.0.0.1:27017/blog_db
JWT_SECRET=<segredo aleatório com pelo menos 32 caracteres>
TEACHER_REGISTRATION_CODE=<código de convite privado para professores>
PORT=3003
```

Gere um segredo JWT com `openssl rand -base64 48`. Não compartilhe nem versione os valores de `JWT_SECRET` e `TEACHER_REGISTRATION_CODE`. Sem `JWT_SECRET` válido, a API não inicia; sem o código de convite, novos cadastros ficam desabilitados.

Instale dependências e inicie a API:

```bash
npm install
npm start
```

## Autenticação e acesso

As consultas `GET` continuam públicas para acesso dos alunos. As operações de criação, edição e exclusão exigem um token Bearer emitido pelo login de um professor aprovado. O token expira em 8 horas.

O cadastro público exige o código de convite configurado em `TEACHER_REGISTRATION_CODE`; o perfil é definido pelo servidor como professor aprovado, ignorando qualquer `role` enviado pelo cliente. Mantenha esse código apenas com pessoas autorizadas.

Contas criadas antes desta proteção não têm aprovação registrada e não conseguem fazer login. Para reabilitar uma conta legítima após verificar sua identidade, marque-a como aprovada diretamente no MongoDB:

```javascript
db.users.updateOne(
  { email: "professor@exemplo.com", role: "teacher" },
  { $set: { approved: true } }
)
```

## Gestão de usuários

Os cadastros escolares atuais de alunos não são contas de login e usam a API `/students`. A rota legada `/users?role=student` ainda administra contas antigas de autenticação.

### Cadastros escolares de alunos

Professores autenticados podem criar, listar/paginar, editar e excluir perfis escolares sem credenciais de login:

- `GET /students?page=1&limit=10`
- `GET /students/:id`
- `POST /students`
- `PUT /students/:id`
- `PUT /students/:id/grades` para substituir as notas por disciplina e bimestre.
- `POST /students/:id/observations` para acrescentar uma observação ao aluno.
- `DELETE /students/:id`

O perfil contém nome, ano escolar (6º ao 9º ano do Ensino Fundamental ou 1º ao 3º ano do Ensino Médio), endereço e até cinco contatos de responsáveis. As notas, de 0 a 10, são gerenciadas separadamente por disciplina e bimestre (1º a 4º) na lista de alunos; observações também ficam vinculadas ao aluno. Todas as rotas exigem autenticação de professor.

Professores autenticados podem gerenciar contas por meio da mesma API usada pelo site e pelo app mobile:

- `GET /users?role=teacher&page=1&limit=10` lista professores; use `role=student` para alunos legados. A resposta inclui `users`, `page`, `limit`, `total` e `pages`.
- `GET /users/:id` retorna os dados de um cadastro, sem a senha.
- `POST /users` cria um usuário com `name`, `email`, `password` e `role`; para professores, `subject` é obrigatório e deve corresponder a uma disciplina disponível ou `Outro`.
- `PUT /users/:id` atualiza `name`, `email`, `password`, `role` e/ou `subject`.
- `DELETE /users/:id` exclui uma conta. A conta do professor autenticado não pode ser excluída por ele mesmo.

A conta `professor@tc4.fiap` é protegida: não pode ser editada nem excluída pela API. As interfaces web e mobile ocultam as ações **Editar** e **Excluir** para essa conta.

Todos esses endpoints exigem token Bearer de professor. Senhas têm pelo menos 8 caracteres e nunca são incluídas nas respostas.
