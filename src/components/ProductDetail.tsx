import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import productsData from '../db/products.json';
import reportsData from '../db/reports.json';
import usersData from '../db/users.json';
import { Product } from '../types';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify'; // XSS 방지를 위한 패키지 (실제로는 추가 필요)

// 모의 API 함수들
const api = {
  getProduct: (productId: string) => {
    // 수정: isDeleted 조건 제거하여 삭제된 상품도 조회 가능하게 함
    const product = productsData.products.find(p => p.id === productId);
    if (!product) {
      return Promise.reject(new Error('상품을 찾을 수 없습니다.'));
    }
    return Promise.resolve({ ...product });
  },
  
  updateProduct: (productId: string, updatedData: Partial<Product>, username: string) => {
    const productIndex = productsData.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return Promise.reject(new Error('상품을 찾을 수 없습니다.'));
    }
    
    const product = productsData.products[productIndex];
    if (product.author !== username && !usersData.users.find(u => u.username === username)?.isAdmin) {
      return Promise.reject(new Error('상품을 수정할 권한이 없습니다.'));
    }
    
    const updatedProduct = { ...product, ...updatedData };
    productsData.products[productIndex] = updatedProduct;
    return Promise.resolve(updatedProduct);
  },
  
  deleteProduct: (productId: string, username: string) => {
    const productIndex = productsData.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return Promise.reject(new Error('상품을 찾을 수 없습니다.'));
    }
    
    const product = productsData.products[productIndex];
    if (product.author !== username && !usersData.users.find(u => u.username === username)?.isAdmin) {
      return Promise.reject(new Error('상품을 삭제할 권한이 없습니다.'));
    }
    
    // 수정: 완전 삭제 대신 isDeleted 플래그 설정
    const updatedProduct = { ...product, isDeleted: true };
    productsData.products[productIndex] = updatedProduct;
    
    return Promise.resolve({ success: true, product: updatedProduct });
  },
  
  reportProduct: (productId: string, reason: string, username: string) => {
    const product = productsData.products.find(p => p.id === productId);
    if (!product) {
      return Promise.reject(new Error('상품을 찾을 수 없습니다.'));
    }
    
    const report = {
      id: crypto.randomUUID(),
      type: 'product' as const,
      contentId: productId,
      reportedUser: product.author,
      reason,
      reportedBy: username,
      createdAt: new Date().toISOString()
    };
    
    reportsData.reports.push(report);
    return Promise.resolve({ success: true });
  },
  
  purchaseProduct: (productId: string, username: string) => {
    const productIndex = productsData.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return Promise.reject(new Error('상품을 찾을 수 없습니다.'));
    }
    
    const product = productsData.products[productIndex];
    
    if (product.purchasedBy) {
      return Promise.reject(new Error('이미 판매된 상품입니다.'));
    }
    
    const buyer = usersData.users.find(u => u.username === username);
    if (!buyer) {
      return Promise.reject(new Error('사용자 정보를 찾을 수 없습니다.'));
    }
    
    if (buyer.balance < product.price) {
      return Promise.reject(new Error('잔액이 부족합니다.'));
    }
    
    // 구매자 잔액 감소
    const buyerIndex = usersData.users.findIndex(u => u.username === username);
    usersData.users[buyerIndex].balance -= product.price;
    
    // 판매자 잔액 증가
    const sellerIndex = usersData.users.findIndex(u => u.username === product.author);
    if (sellerIndex !== -1) {
      usersData.users[sellerIndex].balance += product.price;
    }
    
    // 상품 상태 업데이트
    const updatedProduct = {
      ...product,
      purchasedBy: username,
      purchasedAt: new Date().toISOString()
    };
    productsData.products[productIndex] = updatedProduct;
    
    return Promise.resolve({
      product: updatedProduct,
      buyerBalance: usersData.users[buyerIndex].balance
    });
  },
  
  cleanupPurchasedProducts: () => {
    const now = new Date();
    let updated = false;
    
    productsData.products = productsData.products.map(p => {
      if (p.purchasedAt) {
        const purchaseDate = new Date(p.purchasedAt);
        const oneDayLater = new Date(purchaseDate.getTime() + 24 * 60 * 60 * 1000);
        if (now > oneDayLater && !p.isDeleted) {
          updated = true;
          return { ...p, isDeleted: true };
        }
      }
      return p;
    });
    
    return Promise.resolve({ updated });
  }
};

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text: string) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 입력값 유효성 검사 함수들
const validateTitle = (title: string) => {
  if (!title.trim()) return '상품명을 입력해주세요.';
  if (title.length > 100) return '상품명은 100자를 초과할 수 없습니다.';
  return null;
};

const validateDescription = (desc: string) => {
  if (!desc.trim()) return '상세 설명을 입력해주세요.';
  if (desc.length > 2000) return '상세 설명은 2000자를 초과할 수 없습니다.';
  return null;
};

const validatePrice = (price: string) => {
  if (!price.trim()) return '가격을 입력해주세요.';
  
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '유효한 숫자를 입력해주세요.';
  if (numPrice < 0) return '가격은 0보다 작을 수 없습니다.';
  if (numPrice > 10000000) return '가격은 1천만원을 초과할 수 없습니다.';
  if (!Number.isInteger(numPrice)) return '가격은 정수만 입력 가능합니다.';
  
  return null;
};

const validateImageUrl = (url: string) => {
  if (!url.trim()) return '이미지 URL을 입력해주세요.';
  
  try {
    new URL(url);
    // 이미지 URL인지 확인 (간단한 확인)
    if (!url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      return '유효한 이미지 URL이 아닙니다.';
    }
  } catch (e) {
    return '유효한 URL을 입력해주세요.';
  }
  
  return null;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, updateBalance, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    description?: string;
    price?: string;
    imageUrl?: string;
    report?: string;
  }>({});

  // 초기 데이터 로드 및 자동 삭제 처리
  useEffect(() => {
    if (!id) {
      setError('상품 ID가 유효하지 않습니다.');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // 판매된 상품 자동 삭제 처리 (최초 1회만)
    api.cleanupPurchasedProducts()
      .catch(err => console.error('상품 자동 삭제 오류:', err));
    
    api.getProduct(id)
      .then(foundProduct => {
        setProduct(foundProduct);
        setTitle(foundProduct.title);
        setDescription(foundProduct.description);
        setPrice(foundProduct.price.toString());
        setImageUrl(foundProduct.imageUrl);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('상품 로드 오류:', err);
        setError(err.message || '상품을 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      });
      
  }, [id]);

  // 판매된 상품 자동 삭제 처리 (주기적)
  useEffect(() => {
    // 1분마다 한 번씩만 체크 (1초마다 체크하는 것보다 효율적)
    const interval = setInterval(() => {
      api.cleanupPurchasedProducts()
        .then(result => {
          if (result.updated && product?.purchasedAt) {
            api.getProduct(id!)
              .then(updatedProduct => {
                setProduct(updatedProduct);
              })
              .catch(() => {
                // 상품이 삭제되었으면 목록으로 이동
                navigate('/products');
              });
          }
        })
        .catch(err => console.error('상품 자동 삭제 오류:', err));
    }, 60000); // 1분마다 실행
    
    return () => clearInterval(interval);
  }, [id, product, navigate]);

  const validateForm = () => {
    const errors = {
      title: validateTitle(title),
      description: validateDescription(description),
      price: validatePrice(price),
      imageUrl: validateImageUrl(imageUrl)
    };
    
    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
      setFormErrors(errors as any);
      return false;
    }
    
    setFormErrors({});
    return true;
  };

  const handleDelete = () => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    
    if (!window.confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    setIsLoading(true);
    api.deleteProduct(id!, user.username)
      .then(() => {
        toast.success('상품이 삭제되었습니다');
        navigate('/products');
      })
      .catch(err => {
        console.error('상품 삭제 오류:', err);
        toast.error(err.message || '상품 삭제 중 오류가 발생했습니다');
        setIsLoading(false);
      });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    
    if (!validateForm()) {
      toast.error('입력 내용을 확인해주세요');
      return;
    }
    
    setIsLoading(true);
    
    // XSS 방지를 위한 텍스트 정화
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedDescription = sanitizeText(description.trim());
    const sanitizedImageUrl = sanitizeText(imageUrl.trim());
    
    const updatedData = {
      title: sanitizedTitle,
      description: sanitizedDescription,
      price: parseInt(price),
      imageUrl: sanitizedImageUrl
    };
    
    api.updateProduct(id!, updatedData, user.username)
      .then(updatedProduct => {
        setProduct(updatedProduct);
        setIsEditing(false);
        toast.success('상품이 수정되었습니다');
      })
      .catch(err => {
        console.error('상품 수정 오류:', err);
        toast.error(err.message || '상품 수정 중 오류가 발생했습니다');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    
    // 자신의 상품은 신고할 수 없음
    if (product?.author === user.username) {
      toast.error('자신의 상품은 신고할 수 없습니다');
      return;
    }
    
    if (!reportReason.trim()) {
      setFormErrors({ report: '신고 사유를 입력해주세요.' });
      return;
    }
    
    if (reportReason.length < 5) {
      setFormErrors({ report: '신고 사유는 최소 5자 이상 입력해주세요.' });
      return;
    }
    
    setIsLoading(true);
    
    // XSS 방지를 위한 텍스트 정화
    const sanitizedReason = sanitizeText(reportReason.trim());
    
    api.reportProduct(id!, sanitizedReason, user.username)
      .then(() => {
        setShowReportForm(false);
        setReportReason('');
        setFormErrors({});
        toast.success('신고가 접수되었습니다');
      })
      .catch(err => {
        console.error('상품 신고 오류:', err);
        toast.error(err.message || '신고 접수 중 오류가 발생했습니다');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePurchase = () => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    
    if (!confirmPurchase) {
      setConfirmPurchase(true);
      return;
    }
    
    setIsLoading(true);
    setConfirmPurchase(false);
    
    api.purchaseProduct(id!, user.username)
      .then(result => {
        setProduct(result.product);
        updateBalance(result.buyerBalance);
        refreshUser();
        toast.success('상품 구매가 완료되었습니다');
      })
      .catch(err => {
        console.error('상품 구매 오류:', err);
        toast.error(err.message || '상품 구매 중 오류가 발생했습니다');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isLoading && !product) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">{error || '상품을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        {/* 삭제된 상품 표시 */}
        {product.isDeleted && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            <p className="font-semibold">이 상품은 삭제되었습니다.</p>
            <p className="text-sm">목록에는 표시되지 않지만, 구매/판매 내역에서 확인할 수 있습니다.</p>
          </div>
        )}
      
        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                상품명
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`mt-1 block w-full rounded-md ${
                  formErrors.title 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } shadow-sm`}
                maxLength={100}
                disabled={isLoading}
                aria-invalid={!!formErrors.title}
                aria-describedby={formErrors.title ? "title-error" : undefined}
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-600" id="title-error">
                  {formErrors.title}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                상세 설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={`mt-1 block w-full rounded-md ${
                  formErrors.description 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } shadow-sm`}
                maxLength={2000}
                disabled={isLoading}
                aria-invalid={!!formErrors.description}
                aria-describedby={formErrors.description ? "desc-error" : undefined}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600" id="desc-error">
                  {formErrors.description}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                가격
              </label>
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`mt-1 block w-full rounded-md ${
                  formErrors.price 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } shadow-sm`}
                min="0"
                max="10000000"
                step="1"
                disabled={isLoading}
                aria-invalid={!!formErrors.price}
                aria-describedby={formErrors.price ? "price-error" : undefined}
              />
              {formErrors.price && (
                <p className="mt-1 text-sm text-red-600" id="price-error">
                  {formErrors.price}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                이미지 URL
              </label>
              <input
                type="url"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={`mt-1 block w-full rounded-md ${
                  formErrors.imageUrl 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } shadow-sm`}
                disabled={isLoading}
                aria-invalid={!!formErrors.imageUrl}
                aria-describedby={formErrors.imageUrl ? "image-error" : undefined}
              />
              {formErrors.imageUrl && (
                <p className="mt-1 text-sm text-red-600" id="image-error">
                  {formErrors.imageUrl}
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormErrors({});
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">{sanitizeText(product.title)}</h2>
              <div className="space-x-2">
                {user?.username === product.author ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                      disabled={isLoading}
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                      disabled={isLoading}
                    >
                      삭제
                    </button>
                  </>
                ) : user?.isAdmin ? (
                  <>
                    {!product.purchasedBy && (
                      <button
                        onClick={handlePurchase}
                        className={`${confirmPurchase ? 'bg-green-600' : 'bg-blue-500'} text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300`}
                        disabled={isLoading}
                      >
                        {confirmPurchase ? '구매 확인' : '구매하기'}
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                      disabled={isLoading}
                    >
                      삭제
                    </button>
                  </>
                ) : user && !product.purchasedBy ? (
                  <>
                    <button
                      onClick={handlePurchase}
                      className={`${confirmPurchase ? 'bg-green-600' : 'bg-blue-500'} text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300`}
                      disabled={isLoading}
                    >
                      {isLoading ? '처리 중...' : confirmPurchase ? '구매 확인' : '구매하기'}
                    </button>
                    <button
                      onClick={() => {
                        if (product.author === user.username) {
                          toast.error('자신의 상품은 신고할 수 없습니다');
                          return;
                        }
                        setShowReportForm(true);
                      }}
                      className="text-red-600 hover:text-red-800 disabled:text-red-300"
                      disabled={isLoading}
                    >
                      신고하기
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            
            <div className="mb-6">
              <img
                src={sanitizeText(product.imageUrl)}
                alt={sanitizeText(product.title)}
                className="w-full max-h-96 object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=이미지+로드+실패';
                }}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">가격</h3>
                <p className="text-2xl text-blue-600 font-bold">
                  {product.price.toLocaleString()}원
                </p>
                {user && !product.purchasedBy && user.username !== product.author && (
                  <p className="text-sm text-gray-500 mt-1">
                    내 잔액: {user.balance.toLocaleString()}원
                    {user.balance < product.price && (
                      <span className="text-red-500 ml-2">(잔액 부족)</span>
                    )}
                  </p>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">상세 설명</h3>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {sanitizeText(product.description)}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-gray-500">
                <span>판매자: 
                  <Link
                    to={`/user/${product.author}`}
                    className="ml-1 font-semibold hover:text-blue-600"
                  >
                    {sanitizeText(product.author)}
                  </Link>
                </span>
                <span>등록일: {format(new Date(product.createdAt), 'yyyy-MM-dd HH:mm')}</span>
              </div>

              {product.purchasedBy && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-gray-700">
                    <span className="font-semibold">구매자:</span> {sanitizeText(product.purchasedBy)}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">구매일:</span> {format(new Date(product.purchasedAt!), 'yyyy-MM-dd HH:mm')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    거래 완료된 상품은 24시간 후 자동으로 목록에서 삭제됩니다.
                  </p>
                </div>
              )}
            </div>

            {showReportForm && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">상품 신고</h3>
                <form onSubmit={handleReport} className="space-y-4">
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                      신고 사유
                    </label>
                    <textarea
                      id="reason"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className={`mt-1 block w-full rounded-md ${
                        formErrors.report 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } shadow-sm`}
                      rows={3}
                      maxLength={500}
                      minLength={5}
                      required
                      disabled={isLoading}
                      aria-invalid={!!formErrors.report}
                      aria-describedby={formErrors.report ? "report-error" : undefined}
                    />
                    {formErrors.report && (
                      <p className="mt-1 text-sm text-red-600" id="report-error">
                        {formErrors.report}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                      disabled={isLoading || !reportReason.trim()}
                    >
                      {isLoading ? '처리 중...' : '신고하기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReportForm(false);
                        setReportReason('');
                        setFormErrors({});
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
                      disabled={isLoading}
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
