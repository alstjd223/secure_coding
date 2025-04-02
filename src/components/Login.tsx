import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Link 추가
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // 입력값 유효성 검사
  const validateInputs = () => {
    if (!username.trim()) {
      setError('아이디를 입력해주세요.');
      return false;
    }
    if (password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 에러 상태 초기화
    setError('');
    
    // 입력값 검증
    if (!validateInputs()) {
      return;
    }
    
    // 로딩 상태 설정
    setIsLoading(true);
    
    try {
      // 로그인 시도
      const success = await Promise.resolve(login(username, password));
      
      if (success) {
        toast.success('로그인되었습니다');
        navigate('/');
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        toast.error('로그인에 실패했습니다');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
      toast.error('로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">로그인</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              아이디
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoComplete="username"
              disabled={isLoading}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoComplete="current-password"
              disabled={isLoading}
              minLength={4}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요? <Link to="/register" className="text-blue-500 hover:text-blue-700">회원가입</Link>
          </p>
        </div>
      </div>
      
      {/* 에러 메시지를 위한 숨겨진 요소 */}
      {error && <div id="login-error" className="sr-only">{error}</div>}
    </div>
  );
};

export default Login;
