process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
process.env.TEACHER_REGISTRATION_CODE = 'test-teacher-invitation-code';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Authentication and teacher authorization', () => {
  let token;
  let postId;
  let commentId;
  let eventId;
  let noticeId;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/blog_db_auth_test');
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('requires an invitation code, issues tokens, and protects all write routes', async () => {
    const unapprovedUser = new User({
      name: 'Unapproved Teacher',
      email: 'unapproved@example.com',
      password: 'password123',
      role: 'teacher'
    });
    await unapprovedUser.save();

    await request(app)
      .post('/login')
      .send({ email: 'unapproved@example.com', password: 'password123' })
      .expect(401);

    await request(app)
      .post('/register')
      .send({
        name: 'Test Teacher',
        email: 'teacher@example.com',
        password: 'password123',
        role: 'teacher'
      })
      .expect(403);

    await request(app)
      .post('/register')
      .send({
        name: 'Test Teacher',
        email: 'teacher@example.com',
        password: 'password123',
        registrationCode: process.env.TEACHER_REGISTRATION_CODE,
        role: 'student'
      })
      .expect(201);

    const registeredUser = await User.findOne({ email: 'teacher@example.com' });
    expect(registeredUser.role).toBe('teacher');
    expect(registeredUser.approved).toBe(true);

    const loginResponse = await request(app)
      .post('/login')
      .send({ email: 'teacher@example.com', password: 'password123' })
      .expect(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
    token = loginResponse.body.token;

    await request(app).post('/posts').send({ title: 'Test', content: 'Test' }).expect(401);
    await request(app).post('/events').send({ title: 'Test', date: '2026-11-15' }).expect(401);
    await request(app).post('/notices').send({ text: 'Test' }).expect(401);

    const postResponse = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Protected post', content: 'Post content', author: 'Forged author' })
      .expect(201);
    postId = postResponse.body._id;
    expect(postResponse.body.author).toBe('Test Teacher');

    const commentResponse = await request(app)
      .post(`/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Teacher comment', author: 'Forged author' })
      .expect(200);
    commentId = commentResponse.body.comments[0]._id;
    expect(commentResponse.body.comments[0].author).toBe('Test Teacher');

    await request(app)
      .delete(`/posts/${postId}/comments/${commentId}?userRole=teacher&userName=Test%20Teacher`)
      .expect(401);

    await request(app)
      .delete(`/posts/${postId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .put(`/posts/${postId}`)
      .send({ title: 'Changed', content: 'Changed' })
      .expect(401);

    await request(app)
      .put(`/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Changed', content: 'Changed', author: 'Forged author' })
      .expect(200);

    const eventResponse = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Protected event', date: '2026-11-15' })
      .expect(201);
    eventId = eventResponse.body._id;

    const noticeResponse = await request(app)
      .post('/notices')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Protected notice', author: 'Forged author' })
      .expect(201);
    noticeId = noticeResponse.body._id;
    expect(noticeResponse.body.author).toBe('Test Teacher');

    await request(app).delete(`/events/${eventId}`).expect(401);
    await request(app).delete(`/notices/${noticeId}`).expect(401);
    await request(app).delete(`/posts/${postId}`).expect(401);

    await request(app)
      .delete(`/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .delete(`/notices/${noticeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .delete(`/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('provides teacher-only paginated user management', async () => {
    await request(app)
      .get('/users?role=student')
      .expect(401);

    const created = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Managed Student',
        email: 'student@example.com',
        password: 'student-password',
        role: 'student'
      })
      .expect(201);
    const userId = created.body._id;
    expect(created.body.role).toBe('student');
    expect(created.body.password).toBeUndefined();

    const listing = await request(app)
      .get('/users?role=student&page=1&limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listing.body.users).toHaveLength(1);
    expect(listing.body.total).toBe(1);
    expect(listing.body.pages).toBe(1);
    expect(listing.body.users[0].password).toBeUndefined();

    const updated = await request(app)
      .put(`/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Student', email: 'updated-student@example.com' })
      .expect(200);
    expect(updated.body.name).toBe('Updated Student');

    await request(app)
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get('/users?role=invalid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app)
      .delete('/users/invalid-user-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('stores the selected subject for managed teachers', async () => {
    await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Managed Teacher',
        email: 'managed-teacher@example.com',
        password: 'teacher-password',
        role: 'teacher',
      })
      .expect(400);

    const created = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Managed Teacher',
        email: 'managed-teacher@example.com',
        password: 'teacher-password',
        role: 'teacher',
        subject: 'Matemática',
      })
      .expect(201);
    expect(created.body.subject).toBe('Matemática');

    const user = await request(app)
      .get(`/users/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(user.body.subject).toBe('Matemática');

    await request(app)
      .put(`/users/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Outro' })
      .expect(200);
  });

  it('prevents deleting or demoting the protected teacher account', async () => {
    const protectedTeacher = await User.create({
      name: 'Protected Teacher',
      email: 'professor@tc4.fiap',
      password: 'protected-password',
      role: 'teacher',
      approved: true,
    });

    await request(app)
      .delete(`/users/${protectedTeacher._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app)
      .put(`/users/${protectedTeacher._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'student' })
      .expect(400);

    const updateResponse = await request(app)
      .put(`/users/${protectedTeacher._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Changed name' })
      .expect(400);
    expect(updateResponse.body.error).toBe('Esta conta não pode ser alterada.');

    await expect(User.findById(protectedTeacher._id)).resolves.toMatchObject({
      name: 'Protected Teacher',
      email: 'professor@tc4.fiap',
      role: 'teacher',
    });
  });
});
