import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// toast import 제거
import DOMPurify from 'dompurify'; // XSS 방지를 위한 패키지 (실제로는 추가 필요)

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 모의 API 함수
const api = {
  register: (username, password, bio) => {
    // 실제 환경에서는 서버 API 호출 및 비밀번호 해싱
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1000);
    });
  }
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    // 사용자명 유효성 검사
    if (!username.trim()) {
      newErrors.username = '아이디를 입력해주세요.';
    } else if (username.length < 4) {
      newErrors.username = '아이디는 최소 4자 이상이어야 합니다.';
    } else if (username.length > 20) {
      newErrors.username = '아이디는 최대 20자까지 가능합니다.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = '아이디는 영문, 숫자, 밑줄(_)만 포함할 수 있습니다.';
    }
    
    // 비밀번호 유효성 검사 - 최소 길이 4자로 변경
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (password.length < 4) {
      newErrors.password = '비밀번호는 최소 4자 이상이어야 합니다.';
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = '비밀번호는 대문자, 소문자, 숫자를 모두 포함해야 합니다.';
    }
    
    // 비밀번호 확인 유효성 검사
    if (password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }
    
    // 소개글 유효성 검사
    if (bio && bio.length > 500) {
      newErrors.bio = '소개글은 최대 500자까지 입력 가능합니다.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // XSS 방지를 위한 텍스트 정화
      const sanitizedUsername = sanitizeText(username.trim());
      const sanitizedBio = sanitizeText(bio.trim());
      
      // 실제 환경에서는 API 호출을 통해 서버에서 처리
      await api.register(sanitizedUsername, password, sanitizedBio);
      
      if (register(sanitizedUsername, password, sanitizedBio)) {
        // toast.success 제거
        navigate('/login');
      } else {
        // toast.error 제거
        setErrors({ username: '이미 존재하는 아이디입니다.' });
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      // toast.error 제거
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">회원가입</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              아이디 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`mt-1 block w-full rounded-md ${
                errors.username 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              } shadow-sm`}
              autoComplete="username"
              maxLength={20}
              disabled={isLoading}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              required
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600" id="username-error">
                {errors.username}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              영문, 숫자, 밑줄(_)만 사용 가능, 4-20자
            </p>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호 <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 block w-full rounded-md ${
                errors.password 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              } shadow-sm`}
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              required
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600" id="password-error">
                {errors.password}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              최소 4자 이상, 대문자, 소문자, 숫자 포함
            </p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              비밀번호 확인 <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 block w-full rounded-md ${
                errors.confirmPassword 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              } shadow-sm`}
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              required
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600" id="confirm-password-error">
                {errors.confirmPassword}
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              소개글
            </label>
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`mt-1 block w-full rounded-md ${
                errors.bio 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              } shadow-sm`}
              rows={3}
              maxLength={500}
              disabled={isLoading}
              aria-invalid={!!errors.bio}
              aria-describedby={errors.bio ? "bio-error" : undefined}
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600" id="bio-error">
                {errors.bio}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 text-right">
              {bio.length}/500자
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : '회원가입'}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요? <Link to="/login" className="text-blue-500 hover:text-blue-700">로그인</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
