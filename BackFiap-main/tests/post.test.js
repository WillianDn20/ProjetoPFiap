process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

// Bloco que agrupa os testes de Posts
describe('Testes da API de Posts', () => {
  let token;
  
  // Roda antes dos testes começarem
  beforeAll(async () => {
    // Utiliza um banco isolado
    await mongoose.connect('mongodb://127.0.0.1:27017/blog_db_test');
    await mongoose.connection.dropDatabase();
    const user = new User({
      name: 'Test Teacher',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'teacher',
      approved: true
    });
    await user.save();

    const login = await request(app)
      .post('/login')
      .send({ email: user.email, password: 'password123' });
    token = login.body.token;
  });

  // Roda depois dos testes terminarem
  afterAll(async () => {
    // Limpa o banco de teste e fecha a conexão
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  //Criar um Post
  it('Deve criar uma nova postagem com sucesso', async () => {
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Post de Teste Automatizado',
        content: 'Este post foi gerado pelo Jest',
        author: 'Sistema'
      });

    //Resultados esperados
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe('Post de Teste Automatizado');
  });

  //Listar Posts
  it('Deve retornar uma lista de postagens', async () => {
    const res = await request(app).get('/posts');

    expect(res.statusCode).toEqual(200);
    // Verifica se o retorno é um array
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('Deve permitir comentários sem login e identificar o autor como visitante', async () => {
    const post = await request(app).get('/posts');
    const res = await request(app)
      .post(`/posts/${post.body[0]._id}/comments`)
      .send({ text: 'Comentário público de teste.' })
      .expect(200);

    expect(res.body.comments.at(-1)).toMatchObject({
      text: 'Comentário público de teste.',
      author: 'Visitante',
    });
  });
});