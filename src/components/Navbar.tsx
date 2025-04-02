import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, MessageSquare, User, Shield, Package, Menu, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { toast } from 'react-hot-toast'; // toast import 추가

const Navbar = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const menuRef = useRef(null);

  const sanitizeText = (text) => {
    if (!text) return '';
    return DOMPurify.sanitize(text);
  };

  // 외부 클릭 감지로 모바일 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // ESC 키로 모바일 메뉴 닫기
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    // 로그아웃 전 alert로 확인
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) {
      return; // 취소 시 로그아웃 중단
    }

    try {
      setLogoutLoading(true);
      await logout();
      navigate('/login');
      toast.success('로그아웃되었습니다');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast.error('로그아웃 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLogoutLoading(false);
      setIsMenuOpen(false);
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const safeUsername = user?.username ? sanitizeText(user.username) : '';

  return (
    <nav className="bg-white shadow-lg" aria-label="메인 네비게이션">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 및 데스크탑 메뉴 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-gray-800 hover:text-gray-600" aria-label="홈으로 이동">
              <Home size={24} />
              <span className="font-semibold hidden sm:block">홈</span>
            </Link>
            
            <div className="hidden md:block ml-6">
              <div className="flex items-center space-x-4">
                {user && (
                  <>
                    <Link to="/products" className="flex items-center space-x-2 text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md" aria-label="상품 페이지로 이동">
                      <Package size={20} />
                      <span>상품</span>
                    </Link>
                    <Link to="/chat" className="flex items-center space-x-2 text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md" aria-label="채팅 페이지로 이동">
                      <MessageSquare size={20} />
                      <span>채팅</span>
                    </Link>
                    {user.isAdmin && (
                      <Link to="/admin" className="flex items-center space-x-2 text-red-600 hover:text-red-800 px-3 py-2 rounded-md" aria-label="관리자 페이지로 이동">
                        <Shield size={20} />
                        <span>관리자</span>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* 데스크탑 사용자 메뉴 */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <span className="text-gray-600" aria-live="polite">로딩 중...</span>
              ) : user ? (
                <>
                  <Link to="/profile" className="flex items-center space-x-2 text-gray-800 hover:text-gray-600" aria-label="프로필로 이동">
                    <User size={20} />
                    <span className="text-gray-600 max-w-[100px] truncate">{safeUsername}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-70"
                    disabled={logoutLoading}
                    aria-label="로그아웃"
                  >
                    {logoutLoading ? '처리 중...' : '로그아웃'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-800 hover:text-gray-600 px-3 py-2"
                    aria-label="로그인 페이지로 이동"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    aria-label="회원가입 페이지로 이동"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
          
          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-800 hover:text-gray-600 focus:outline-none"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div 
          className="md:hidden p-4 border-t border-gray-200"
          ref={menuRef}
          role="menu"
        >
          <div className="flex flex-col space-y-3">
            {isLoading ? (
              <div className="text-center py-4">
                <span className="text-gray-600" aria-live="polite">로딩 중...</span>
              </div>
            ) : user ? (
              <>
                <Link 
                  to="/products" 
                  className="flex items-center space-x-2 text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md"
                  onClick={closeMenu}
                  role="menuitem"
                >
                  <Package size={20} />
                  <span>상품</span>
                </Link>
                <Link 
                  to="/chat" 
                  className="flex items-center space-x-2 text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md"
                  onClick={closeMenu}
                  role="menuitem"
                >
                  <MessageSquare size={20} />
                  <span>채팅</span>
                </Link>
                {user.isAdmin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center space-x-2 text-red-600 hover:text-red-800 px-3 py-2 rounded-md"
                    onClick={closeMenu}
                    role="menuitem"
                  >
                    <Shield size={20} />
                    <span>관리자</span>
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md"
                  onClick={closeMenu}
                  role="menuitem"
                >
                  <User size={20} />
                  <span>{safeUsername}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-70 text-left"
                  disabled={logoutLoading}
                  role="menuitem"
                >
                  {logoutLoading ? '처리 중...' : '로그아웃'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md"
                  onClick={closeMenu}
                  role="menuitem"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  onClick={closeMenu}
                  role="menuitem"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
