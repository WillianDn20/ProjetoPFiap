import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Container = styled.div`
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  font-family: Arial, sans-serif;
`;

const Title = styled.h2`
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  padding: 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }
`;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/login', { email, password });
      
      // Recebe o email junto com o nome e a role
      const { token, role, name, email: userEmail } = response.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', name);
      localStorage.setItem('userEmail', userEmail);
      
      if (role === 'teacher') {
        navigate('/admin');
      } else {
        navigate('/'); 
      }
      
    } catch (error) {
      console.error("Login error:", error);
      alert("Credenciais inválidas! Verifique seu e-mail e senha.");
    }
  };

  return (
    <Container>
      <Title>Acesso de professor</Title>
      
      <Form onSubmit={handleLogin}>
        <Input 
          type="email" 
          placeholder="Seu e-mail" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <Input 
          type="password" 
          placeholder="Sua senha" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <Button type="submit">Entrar</Button>
      </Form>
    </Container>
  );
}

export default Login;