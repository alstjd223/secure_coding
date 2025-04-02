import React from 'react';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify'; // XSS 방지를 위한 패키지 (실제로는 추가 필요)

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

const Home = () => {
  const { user, isLoading } = useAuth();
  
  // 안전한 사용자 이름 표시
  const safeUsername = user && user.username ? sanitizeText(user.username) : '게스트';

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md" role="main" aria-labelledby="welcome-heading">
        <h1 
          id="welcome-heading" 
          className="text-2xl sm:text-3xl font-bold mb-4 md:mb-6"
        >
          {user ? `환영합니다, ${safeUsername}님!` : '환영합니다!'}
        </h1>
        <p className="text-gray-600">
          {user 
            ? '로그인되었습니다. 이제 다양한 활동을 하실 수 있습니다.'
            : '로그인하여 다양한 기능을 이용해보세요.'}
        </p>
      </div>
    </div>
  );
};

export default Home;
