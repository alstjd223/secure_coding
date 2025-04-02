import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import Chat from './components/Chat';
import UserProfile from './components/UserProfile';
import PrivateChat from './components/PrivateChat';
import Products from './components/Products';
import ProductForm from './components/ProductForm';
import ProductDetail from './components/ProductDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:username" element={<PrivateChat />} />
              <Route path="/user/:username" element={<UserProfile />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/new" element={<ProductForm />} />
              <Route path="/products/:id" element={<ProductDetail />} />
            </Routes>
          </div>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;