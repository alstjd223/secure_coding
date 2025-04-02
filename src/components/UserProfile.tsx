import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usersData from '../db/users.json';
import reportsData from '../db/reports.json';
import productsData from '../db/products.json';
import { Product } from '../types';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 모의 API 함수
const api = {
  getUser: (username) => {
    const user = usersData.users.find(u => u.username === username);
    if (!user) {
      return Promise.reject(new Error('사용자를 찾을 수 없습니다.'));
    }
    return Promise.resolve({ ...user });
  },
  
  getUserProducts: (username) => {
    // 수정: isDeleted 조건 제거하여 삭제된 상품도 표시
    const products = productsData.products.filter(
      product => product.author === username
    );
    return Promise.resolve([...products]);
  },
  
  reportUser: (reportData) => {
    if (!reportData.reason || reportData.reason.trim().length < 5) {
      return Promise.reject(new Error('신고 사유는 최소 5자 이상이어야 합니다.'));
    }
    
    reportsData.reports.push({
      id: crypto.randomUUID(),
      type: 'user',
      reportedUser: reportData.username,
      reason: reportData.reason,
      reportedBy: reportData.reporterUsername,
      createdAt: new Date().toISOString()
    });
    
    return Promise.resolve({ success: true });
  },
  
  banUser: (username, days, adminUsername) => {
    // 실제 환경에서는 서버에서 관리자 권한 확인
    const admin = usersData.users.find(u => u.username === adminUsername);
    if (!admin?.isAdmin) {
      return Promise.reject(new Error('관리자 권한이 필요합니다.'));
    }
    
    if (isNaN(days) || days <= 0 || days > 365) {
      return Promise.reject(new Error('차단 기간은 1일부터 365일 사이여야 합니다.'));
    }
    
    const userIndex = usersData.users.findIndex(u => u.username === username);
    if (userIndex === -1) {
      return Promise.reject(new Error('사용자를 찾을 수 없습니다.'));
    }
    
    const banExpiry = new Date();
    banExpiry.setDate(banExpiry.getDate() + parseInt(days));
    
    usersData.users[userIndex] = {
      ...usersData.users[userIndex],
      canLogin: false,
      banExpiry: banExpiry.toISOString()
    };
    
    return Promise.resolve({
      success: true,
      user: usersData.users[userIndex],
      expiryDate: banExpiry
    });
  },
  
  unbanUser: (username, adminUsername) => {
    // 실제 환경에서는 서버에서 관리자 권한 확인
    const admin = usersData.users.find(u => u.username === adminUsername);
    if (!admin?.isAdmin) {
      return Promise.reject(new Error('관리자 권한이 필요합니다.'));
    }
    
    const userIndex = usersData.users.findIndex(u => u.username === username);
    if (userIndex === -1) {
      return Promise.reject(new Error('사용자를 찾을 수 없습니다.'));
    }
    
    usersData.users[userIndex] = {
      ...usersData.users[userIndex],
      canLogin: true,
      banExpiry: undefined
    };
    
    return Promise.resolve({
      success: true,
      user: usersData.users[userIndex]
    });
  }
};

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'products'>('profile');
  const [banDuration, setBanDuration] = useState('7'); // Default 7 days
  const [isBanned, setIsBanned] = useState(false);
  const [showBanDurationInput, setShowBanDurationInput] = useState(false);
  const [banExpiryDate, setBanExpiryDate] = useState<Date | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [banError, setBanError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const banButtonRef = useRef<HTMLButtonElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  // 키보드 조작으로 모달 닫기 (ESC 키)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showBanDurationInput) {
        setShowBanDurationInput(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBanDurationInput]);

  // 모달이 열리면 초기 포커스 설정
  useEffect(() => {
    if (showBanDurationInput && initialFocusRef.current) {
      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 100);
    }
  }, [showBanDurationInput]);

  // 사용자 정보 및 상품 로드
  useEffect(() => {
    if (!username) {
      setError('유효하지 않은 사용자명입니다.');
      setIsLoading(false);
      return;
    }
    
    const loadUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [userData, products] = await Promise.all([
          api.getUser(username),
          api.getUserProducts(username)
        ]);
        
        setProfileUser(userData);
        setUserProducts(products);
        
        // 차단 상태 확인
        if (userData.banExpiry && new Date(userData.banExpiry) > new Date()) {
          setIsBanned(true);
          setBanExpiryDate(new Date(userData.banExpiry));
        } else {
          setIsBanned(false);
          setBanExpiryDate(null);
        }
      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError(err.message || '사용자 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [username]);

  // 사용자가 없거나 로딩 중일 때
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">{error || '사용자를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 자신의 프로필인 경우
  if (user?.username === username) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-700">이 페이지는 본인의 프로필입니다.</p>
          <Link 
            to="/profile"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            마이페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    
    if (!reportReason.trim()) {
      setReportError('신고 사유를 입력해주세요.');
      return;
    }
    
    if (reportReason.trim().length < 5) {
      setReportError('신고 사유는 최소 5자 이상 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    setReportError(null);
    
    try {
      // XSS 방지를 위한 텍스트 정화
      const sanitizedReason = sanitizeText(reportReason.trim());
      
      await api.reportUser({
        username,
        reason: sanitizedReason,
        reporterUsername: user.username
      });
      
      setShowReportForm(false);
      setReportReason('');
      toast.success('신고가 접수되었습니다');
    } catch (err) {
      console.error('신고 오류:', err);
      setReportError(err.message || '신고 접수 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBanUser = async () => {
    if (!user?.isAdmin) {
      toast.error('관리자 권한이 필요합니다');
      return;
    }
    
    const days = parseInt(banDuration);
    if (isNaN(days) || days <= 0 || days > 365) {
      setBanError('차단 기간은 1일부터 365일 사이여야 합니다.');
      return;
    }
    
    setIsSubmitting(true);
    setBanError(null);
    
    try {
      const result = await api.banUser(username, days, user.username);
      setIsBanned(true);
      setBanExpiryDate(new Date(result.expiryDate));
      setShowBanDurationInput(false);
      toast.success(`${username} 사용자가 ${days}일 동안 차단되었습니다`);
      
      // 차단 후 포커스 복원
      setTimeout(() => {
        banButtonRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error('사용자 차단 오류:', err);
      setBanError(err.message || '사용자 차단 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!user?.isAdmin) {
      toast.error('관리자 권한이 필요합니다');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await api.unbanUser(username, user.username);
      setIsBanned(false);
      setBanExpiryDate(null);
      toast.success(`${username} 사용자의 차단이 해제되었습니다`);
    } catch (err) {
      console.error('사용자 차단 해제 오류:', err);
      toast.error(err.message || '사용자 차단 해제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 외부 클릭 시 닫기
  const handleModalOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setShowBanDurationInput(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold" id="user-profile-heading">
              {sanitizeText(profileUser.username)}
              {isBanned && (
                <span className="ml-2 text-sm text-red-600 font-normal">
                  (차단됨)
                </span>
              )}
            </h2>
            {isBanned && banExpiryDate && (
              <p className="text-sm text-red-600">
                차단 해제일: {format(banExpiryDate, 'yyyy-MM-dd HH:mm')}
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/chat/${username}`)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isSubmitting}
            >
              1:1 채팅
            </button>
            {user?.isAdmin ? (
              <>
                {isBanned ? (
                  <button
                    ref={banButtonRef}
                    onClick={handleUnbanUser}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-green-300"
                    disabled={isSubmitting}
                    aria-label={`${username} 사용자 차단 해제`}
                  >
                    {isSubmitting ? '처리 중...' : '차단 해제'}
                  </button>
                ) : (
                  <button
                    ref={banButtonRef}
                    onClick={() => setShowBanDurationInput(true)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                    disabled={isSubmitting}
                    aria-label={`${username} 사용자 차단`}
                  >
                    차단
                  </button>
                )}
              </>
            ) : (
              user && user.username !== profileUser.username && (
                <button
                  onClick={() => setShowReportForm(true)}
                  className="text-red-600 hover:text-red-800 disabled:text-red-300"
                  disabled={isSubmitting}
                >
                  신고하기
                </button>
              )
            )}
          </div>
        </div>

        {/* Ban Duration Input Modal */}
        {showBanDurationInput && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={handleModalOutsideClick}
            role="dialog"
            aria-labelledby="ban-modal-title"
            aria-modal="true"
          >
            <div 
              ref={modalRef}
              className="p-6 bg-white rounded-md shadow-lg w-96"
            >
              <h4 id="ban-modal-title" className="text-lg font-semibold mb-2">
                {sanitizeText(username)} 사용자 차단
              </h4>
              <p className="mb-4 text-sm text-gray-600">
                차단 기간을 설정하세요 (1-365일)
              </p>
              
              {banError && (
                <p className="text-red-600 text-sm mb-2">{banError}</p>
              )}
              
              <input
                ref={initialFocusRef}
                type="number"
                value={banDuration}
                onChange={e => setBanDuration(e.target.value)}
                min="1"
                max="365"
                className={`border px-4 py-2 rounded-md w-full ${
                  banError ? 'border-red-300' : 'border-gray-300'
                }`}
                aria-invalid={!!banError}
                disabled={isSubmitting}
              />
              
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={handleBanUser}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리 중...' : '차단하기'}
                </button>
                <button
                  onClick={() => setShowBanDurationInput(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
                  disabled={isSubmitting}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-md ${activeTab === 'profile' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            disabled={isSubmitting}
          >
            프로필
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md ${activeTab === 'products' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            disabled={isSubmitting}
          >
            판매 상품
          </button>
        </div>

        {activeTab === 'profile' && (
          <div 
            className="space-y-6"
            aria-labelledby="user-profile-heading"
          >
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">아이디</h3>
              <p className="text-gray-700">{sanitizeText(profileUser.username) || '아이디가 없습니다.'}</p>
            </div>
        
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">소개글</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{sanitizeText(profileUser.bio) || '소개글이 없습니다.'}</p>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="pt-2">
            <h3 className="text-lg font-semibold mb-4">판매 상품</h3>
            {userProducts.length === 0 ? (
              <p className="text-gray-600">등록한 상품이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative"
                    role="link"
                    tabIndex={0}
                    aria-label={`${sanitizeText(product.title)}, 가격: ${product.price.toLocaleString()}원`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/products/${product.id}`);
                      }
                    }}
                  >
                    {product.isDeleted && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                        <span className="text-white font-bold px-2 py-1 bg-red-600 rounded">삭제됨</span>
                      </div>
                    )}
                    <div className="aspect-w-16 aspect-h-9">
                      <img
                        src={sanitizeText(product.imageUrl)}
                        alt=""
                        className="object-cover w-full h-48"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=이미지+없음';
                        }}
                        loading="lazy"
                      />
                      {product.purchasedBy && !product.isDeleted && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">판매 완료</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-2">{sanitizeText(product.title)}</h3>
                      <p className="text-blue-600 font-semibold">{product.price.toLocaleString()}원</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {format(new Date(product.createdAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                      {product.purchasedBy && (
                        <p className="text-sm text-blue-600 mt-1">판매 완료</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showReportForm && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">사용자 신고</h3>
            <form onSubmit={handleReport} className="space-y-4">
              {reportError && (
                <p className="text-red-600 text-sm">{reportError}</p>
              )}
              <div>
                <label htmlFor="reportReason" className="block text-sm font-medium text-gray-700 mb-1">
                  신고 사유
                </label>
                <textarea
                  id="reportReason"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className={`w-full border rounded-md p-2 ${
                    reportError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="신고 사유를 입력하세요 (최소 5자 이상)"
                  minLength={5}
                  maxLength={500}
                  required
                  disabled={isSubmitting}
                  aria-invalid={!!reportError}
                />
                <p className="mt-1 text-right text-xs text-gray-500">
                  {reportReason.length}/500자
                </p>
              </div>
              <div className="flex space-x-2">
                <button 
                  type="submit" 
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                  disabled={isSubmitting || !reportReason.trim()}
                >
                  {isSubmitting ? '처리 중...' : '신고하기'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowReportForm(false);
                    setReportReason('');
                    setReportError(null);
                  }} 
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
                  disabled={isSubmitting}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
