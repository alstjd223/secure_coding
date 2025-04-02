import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import productsData from '../db/products.json';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify'; // XSS 방지를 위한 패키지 (실제로는 추가 필요)

// 모의 API 함수
const api = {
  createProduct: (productData) => {
    const newProduct = {
      id: crypto.randomUUID(),
      ...productData,
      createdAt: new Date().toISOString(),
      isDeleted: false
    };
    
    productsData.products.push(newProduct);
    return Promise.resolve(newProduct);
  }
};

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 입력값 유효성 검사 함수들
const validateTitle = (title) => {
  if (!title.trim()) return '상품명을 입력해주세요.';
  if (title.length > 100) return '상품명은 100자를 초과할 수 없습니다.';
  return null;
};

const validateDescription = (desc) => {
  if (!desc.trim()) return '상세 설명을 입력해주세요.';
  if (desc.length > 2000) return '상세 설명은 2000자를 초과할 수 없습니다.';
  return null;
};

const validatePrice = (price) => {
  if (!price.trim()) return '가격을 입력해주세요.';
  
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '유효한 숫자를 입력해주세요.';
  if (numPrice < 0) return '가격은 0보다 작을 수 없습니다.';
  if (numPrice > 10000000) return '가격은 1천만원을 초과할 수 없습니다.';
  if (!Number.isInteger(numPrice)) return '가격은 정수만 입력 가능합니다.';
  
  return null;
};

const validateImageUrl = (url) => {
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

const ProductForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 인증 상태 확인
  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);
  
  // 이미지 미리보기 설정
  useEffect(() => {
    if (validateImageUrl(imageUrl) === null) {
      setPreviewImage(imageUrl);
    } else {
      setPreviewImage('');
    }
  }, [imageUrl]);

  const validateForm = () => {
    const errors = {
      title: validateTitle(title),
      description: validateDescription(description),
      price: validatePrice(price),
      imageUrl: validateImageUrl(imageUrl)
    };
    
    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
      setFormErrors(errors);
      return false;
    }
    
    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('로그인이 필요합니다');
      navigate('/login');
      return;
    }
    
    if (!validateForm()) {
      toast.error('입력 내용을 확인해주세요');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // XSS 방지를 위한 텍스트 정화
      const sanitizedTitle = sanitizeText(title.trim());
      const sanitizedDescription = sanitizeText(description.trim());
      const sanitizedImageUrl = sanitizeText(imageUrl.trim());
      
      const productData = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: parseInt(price),
        imageUrl: sanitizedImageUrl,
        author: user.username
      };
      
      await api.createProduct(productData);
      toast.success('상품이 성공적으로 등록되었습니다');
      navigate('/products');
    } catch (error) {
      console.error('상품 등록 오류:', error);
      toast.error('상품 등록 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">로그인이 필요합니다.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">상품 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isSubmitting}
              aria-invalid={!!formErrors.title}
              aria-describedby={formErrors.title ? "title-error" : undefined}
              required
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
              disabled={isSubmitting}
              aria-invalid={!!formErrors.description}
              aria-describedby={formErrors.description ? "desc-error" : undefined}
              required
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600" id="desc-error">
                {formErrors.description}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500 text-right">
              {description.length}/2000
            </p>
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
              disabled={isSubmitting}
              aria-invalid={!!formErrors.price}
              aria-describedby={formErrors.price ? "price-error" : undefined}
              required
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
              disabled={isSubmitting}
              aria-invalid={!!formErrors.imageUrl}
              aria-describedby={formErrors.imageUrl ? "image-error" : undefined}
              required
            />
            {formErrors.imageUrl && (
              <p className="mt-1 text-sm text-red-600" id="image-error">
                {formErrors.imageUrl}
              </p>
            )}
            
            {previewImage && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-1">이미지 미리보기:</p>
                <img 
                  src={previewImage} 
                  alt="이미지 미리보기" 
                  className="w-full max-h-64 object-contain border rounded-md"
                  onError={() => {
                    setPreviewImage('');
                    setFormErrors({
                      ...formErrors,
                      imageUrl: '이미지를 불러올 수 없습니다. URL을 확인해주세요.'
                    });
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
