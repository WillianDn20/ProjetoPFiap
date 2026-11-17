process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Student = require('../src/models/Student');
const User = require('../src/models/User');

describe('Student profiles', () => {
  let token;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/blog_db_students_test');
    await mongoose.connection.dropDatabase();
    const teacher = await User.create({
      name: 'Student Manager',
      email: 'student-manager@example.com',
      password: 'password123',
      role: 'teacher',
      approved: true,
    });
    token = jwt.sign({ sub: teacher._id.toString() }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('requires a teacher and supports paginated student profile CRUD', async () => {
    await request(app).get('/students').expect(401);

    const headers = { Authorization: 'Bearer ' + token };
    const requiredFields = {
      name: 'Student Profile',
      gradeLevel: '6º ano do Ensino Fundamental',
      address: 'School address',
      guardians: [{ name: 'Guardian', phone: '(11) 111111111' }],
    };
    await request(app)
      .post('/students')
      .set(headers)
      .send({ ...requiredFields, address: '  ' })
      .expect(400);
    await request(app)
      .post('/students')
      .set(headers)
      .send({ ...requiredFields, guardians: [{ name: '', phone: '555-0100' }] })
      .expect(400);
    await request(app)
      .post('/students')
      .set(headers)
      .send({ ...requiredFields, guardians: [{ name: 'Guardian', phone: '', email: '' }] })
      .expect(400);
    await request(app)
      .post('/students')
      .set(headers)
      .send({ ...requiredFields, guardians: [{ name: 'Guardian', phone: '(11) 1111111111' }] })
      .expect(400);
    await request(app)
      .post('/students')
      .set(headers)
      .send({ ...requiredFields, guardians: [{ name: 'Guardian', phone: '1199999999' }] })
      .expect(400);

    const created = await request(app)
      .post('/students')
      .set(headers)
      .send({
        name: 'Student Profile',
        gradeLevel: '6º ano do Ensino Fundamental',
        address: 'School address',
        guardians: [{
          name: 'Guardian',
          phone: '(11) 111111111',
          email: 'guardian@example.com',
        }],
        grades: [{ subject: 'Matemática', score: 9.5 }],
      })
      .expect(201);

    const studentId = created.body._id;
    expect(created.body.email).toBeUndefined();
    expect(created.body.gradeLevel).toBe('6º ano do Ensino Fundamental');
    expect(created.body.grades).toEqual([{ subject: 'Matemática', score: 9.5, bimester: 1 }]);
    expect(created.body.guardians[0].phone).toBe('(11) 111111111');
    expect(created.body.guardians[0].email).toBe('guardian@example.com');

    const listing = await request(app)
      .get('/students?page=1&limit=10')
      .set(headers)
      .expect(200);
    expect(listing.body.students).toHaveLength(1);
    expect(listing.body.total).toBe(1);

    await request(app)
      .put(`/students/${studentId}/grades`)
      .set(headers)
      .send({
        grades: [
          { subject: 'Matemática', bimester: 1, score: 9.5 },
          { subject: 'Matemática', bimester: 2, score: 8 },
        ],
      })
      .expect(200);

    await request(app)
      .put(`/students/${studentId}/grades`)
      .set(headers)
      .send({ grades: [{ subject: 'Matemática', bimester: 5, score: 8 }] })
      .expect(400);

    await request(app)
      .put(`/students/${studentId}/grades`)
      .set(headers)
      .send({ grades: [{ subject: 'Ensino Religioso', bimester: 1, score: 8 }] })
      .expect(400);

    await Student.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(studentId) },
      { $unset: { 'grades.0.bimester': 1 } }
    );

    const observation = await request(app)
      .post(`/students/${studentId}/observations`)
      .set(headers)
      .send({ text: 'Participou bem das atividades.' })
      .expect(201);
    expect(observation.body.observations).toHaveLength(1);
    expect(observation.body.observations[0].authorName).toBe('Student Manager');

    const observationId = observation.body.observations[0]._id;
    await request(app)
      .delete(`/students/${studentId}/observations/${observationId}`)
      .set(headers)
      .expect(200);
    const afterDelete = await request(app)
      .get(`/students/${studentId}`)
      .set(headers)
      .expect(200);
    expect(afterDelete.body.observations).toHaveLength(0);

    await request(app)
      .delete(`/students/${studentId}/observations/not-an-id`)
      .set(headers)
      .expect(400);

    await request(app)
      .delete(`/students/${studentId}/observations/${new mongoose.Types.ObjectId()}`)
      .set(headers)
      .expect(404);

    await request(app)
      .put(`/students/${studentId}`)
      .set(headers)
      .send({
        name: 'Updated Student Profile',
        gradeLevel: '6º ano do Ensino Fundamental',
        address: 'Updated address',
        guardians: [{ name: 'Updated Guardian', phone: '11999999999' }],
      })
      .expect(200);
    expect((await Student.findById(studentId).lean()).guardians[0].phone).toBe('(11) 999999999');

    const reloaded = await request(app)
      .get(`/students/${studentId}`)
      .set(headers)
      .expect(200);
    expect(reloaded.body.grades).toHaveLength(2);
    expect(reloaded.body.observations).toHaveLength(0);

    await request(app)
      .put(`/students/${studentId}`)
      .set(headers)
      .send({
        name: 'Invalid Student Profile',
        gradeLevel: '6º ano do Ensino Fundamental',
        grades: [{ subject: 'Matemática', score: 11 }],
      })
      .expect(400);

    await request(app)
      .delete(`/students/${studentId}`)
      .set(headers)
      .expect(200);
  });
});
