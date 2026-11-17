import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Post from './pages/Post';
import Admin from './pages/Admin';
import Login from './pages/Login';
import PostForm from './pages/PostForm';
import Calendar from './pages/Calendar'; 
import Users from './pages/Users';
import UserForm from './pages/UserForm';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        
        <Route path="/calendario" element={<Calendar />} />
        
        <Route path="/post/new" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><PostForm /></PrivateRoute>} />
        <Route path="/post/novo" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><PostForm /></PrivateRoute>} />
        
        <Route path="/post/:id" element={<Post />} />

        <Route path="/admin" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><Admin /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><Users /></PrivateRoute>} />
        <Route path="/usuarios/novo" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><UserForm /></PrivateRoute>} />
        <Route path="/usuarios/:role/:id/editar" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><UserForm /></PrivateRoute>} />
        <Route path="/users" element={<Navigate to="/usuarios" replace />} />
        
        <Route path="/post/edit/:id" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><PostForm /></PrivateRoute>} />
        <Route path="/post/editar/:id" element={<PrivateRoute allowedRoles={['teacher', 'professor']}><PostForm /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;