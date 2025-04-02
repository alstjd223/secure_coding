import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import productsData from '../db/products.json';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 모의 API 함수
const api = {
  getUserPurchases: (username) => {
    // 수정: isDeleted 조건 제거하여 삭제된 상품도 구매내역에 표시
    const purchases = productsData.products.filter(
      product => product.purchasedBy === username
    );
    return Promise.resolve([...purchases]);
  },
  
  getUserProducts: (username) => {
    // 수정: isDeleted 조건 제거하여 삭제된 상품도 판매내역에 표시
    const products = productsData.products.filter(
      product => product.author === username
    );
    return Promise.resolve([...products]);
  },
  
  updateBio: (username, bio) => {
    // 실제 환경에서는 서버 API 호출
    return Promise.resolve({ success: true, bio });
  }
};

const Profile = () => {
  const { user, updatePassword, updateBio, refreshUser } = useAuth();
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'purchases' | 'products'>('profile');
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [bioErrors, setBioErrors] = useState('');

  // 초기 데이터 로드
  useEffect(() => {
    if (!user) return;
    
    setNewBio(user.bio || '');
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [purchases, products] = await Promise.all([
          api.getUserPurchases(user.username),
          api.getUserProducts(user.username)
        ]);
        
        setPurchasedProducts(purchases);
        setMyProducts(products);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        toast.error('데이터를 불러오는 중 오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // 5분마다 한 번씩 데이터 갱신
    const interval = setInterval(() => {
      refreshUser();
      loadData();
    }, 300000); // 5분 = 300,000ms
    
    return () => clearInterval(interval);
  }, [user, refreshUser]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">로그인이 필요합니다.</p>
          <Link 
            to="/login"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirmPassword: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    
    if (updatePassword(oldPassword, newPassword)) {
      toast.success('비밀번호가 변경되었습니다');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } else {
      setPasswordErrors({ oldPassword: '현재 비밀번호가 올바르지 않습니다.' });
      toast.error('현재 비밀번호가 올바르지 않습니다');
    }
  };

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    
    if (currentPassword === user.password) {
      setIsVerifying(false);
      setShowPassword(true);
      setCurrentPassword('');
    } else {
      toast.error('비밀번호가 올바르지 않습니다');
    }
  };

  const handleBioUpdate = (e) => {
    e.preventDefault();
    
    if (newBio.length > 500) {
      setBioErrors('소개글은 500자를 초과할 수 없습니다.');
      return;
    }
    
    const sanitizedBio = sanitizeText(newBio.trim());
    
    if (updateBio(sanitizedBio)) {
      toast.success('소개글이 수정되었습니다');
      setEditingBio(false);
      setBioErrors('');
    } else {
      toast.error('소개글 수정 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'profile'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            프로필
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'purchases'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            구매 내역
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'products'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            판매 상품
          </button>
        </div>

        {activeTab === 'profile' && (
          <>
            <h2 className="text-2xl font-bold mb-6">마이페이지</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700">아이디</label>
                <p className="mt-1 text-gray-900">{sanitizeText(user.username)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">보유 금액</label>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {user.balance.toLocaleString()}원
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                <div className="mt-1 relative">
                  <p className="text-gray-900">
                    {showPassword ? user.password : '••••••'}
                  </p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">소개글</label>
                  <button
                    onClick={() => setEditingBio(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    수정
                  </button>
                </div>
                {editingBio ? (
                  <form onSubmit={handleBioUpdate} className="space-y-2">
                    <textarea
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      className={`w-full rounded-md ${
                        bioErrors ? 'border-red-300' : 'border-gray-300'
                      } shadow-sm`}
                      rows={3}
                      maxLength={500}
                    />
                    {bioErrors && (
                      <p className="text-sm text-red-600">{bioErrors}</p>
                    )}
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">{newBio.length}/500</p>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBio(false);
                            setNewBio(user.bio || '');
                            setBioErrors('');
                          }}
                          className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{sanitizeText(user.bio) || '소개글이 없습니다.'}</p>
                )}
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">비밀번호 변경</h3>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700">
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className={`mt-1 block w-full rounded-md ${
                      passwordErrors.oldPassword ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm`}
                    required
                  />
                  {passwordErrors.oldPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.oldPassword}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`mt-1 block w-full rounded-md ${
                      passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm`}
                    required
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                >
                  비밀번호 변경
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'purchases' && (
          <>
            <h2 className="text-2xl font-bold mb-6">구매 내역</h2>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-600">데이터를 불러오는 중...</p>
              </div>
            ) : purchasedProducts.length === 0 ? (
              <p className="text-gray-600">구매한 상품이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchasedProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative"
                  >
                    {product.isDeleted && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                        <span className="text-white font-bold px-2 py-1 bg-red-600 rounded">삭제됨</span>
                      </div>
                    )}
                    <div className="aspect-w-16 aspect-h-9">
                      <img
                        src={sanitizeText(product.imageUrl)}
                        alt={sanitizeText(product.title)}
                        className="object-cover w-full h-48"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=이미지+없음';
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-2">{sanitizeText(product.title)}</h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">판매자: {sanitizeText(product.author)}</span>
                      </div>
                      <p className="text-blue-600 font-semibold">
                        {product.price.toLocaleString()}원
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        구매일: {format(new Date(product.purchasedAt!), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'products' && (
          <>
            <h2 className="text-2xl font-bold mb-6">판매 상품</h2>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-600">데이터를 불러오는 중...</p>
              </div>
            ) : myProducts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">등록한 상품이 없습니다.</p>
                <Link
                  to="/products/new"
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  상품 등록하기
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className={`block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative ${
                      product.purchasedBy ? 'bg-gray-100' : ''
                    }`}
                  >
                    {product.isDeleted && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                        <span className="text-white font-bold px-2 py-1 bg-red-600 rounded">삭제됨</span>
                      </div>
                    )}
                    <div className="aspect-w-16 aspect-h-9 relative">
                      <img
                        src={sanitizeText(product.imageUrl)}
                        alt={sanitizeText(product.title)}
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
                      <p className="text-blue-600 font-semibold">
                        {product.price.toLocaleString()}원
                      </p>
                      {product.purchasedBy && (
                        <p className="text-sm text-gray-500 mt-2">
                          판매일: {format(new Date(product.purchasedAt!), 'yyyy-MM-dd HH:mm')}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
