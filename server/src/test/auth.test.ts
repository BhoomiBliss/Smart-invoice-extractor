import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.routes';
import errorMiddleware from '../middleware/error.middleware';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use(errorMiddleware);

describe('Express API Gateway Authentication routes', () => {
  const testUser = {
    name: 'Bhoomi Test',
    email: `test_${Date.now()}@domain.com`,
    password: 'secure_password_123'
  };

  it('should register a new accountant account successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testUser.email);
  });

  it('should reject registration if the email is already registered', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should authenticate user logins with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject logins with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'incorrect_password'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });
});
