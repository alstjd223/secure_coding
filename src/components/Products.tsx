import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import productsData from '../db/products.json';
import { Product } from '../types';
import DOMPurify from 'dompurify';

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 모의 API 함수
const api = {
  getProducts: () => {
    // 목록에는 isDeleted=true인 상품이 표시되지 않음 (이 필터링은 유지)
    const filteredProducts = productsData.products.filter(product => !product.isDeleted);
    return Promise.resolve([...filteredProducts].reverse());
  }
};

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchField, setSearchField] = useState('title'); // 'title', 'description', 'all'

  // 인증 상태 확인
  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  // 상품 데이터 로드
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await api.getProducts();
        setProducts(data);
      } catch (err) {
        console.error('상품 로드 오류:', err);
        setError('상품 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
    
    // 상품 데이터 주기적 갱신 (30초마다)
    const interval = setInterval(loadProducts, 30000);
    return () => clearInterval(interval);
  }, []);

  // 검색 필터링 로직
  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    
    if (!term) return true;
    
    switch (searchField) {
      case 'title':
        return product.title.toLowerCase().includes(term);
      case 'description':
        return product.description.toLowerCase().includes(term);
      case 'all':
        return (
          product.title.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term) ||
          product.author.toLowerCase().includes(term)
        );
      default:
        return product.title.toLowerCase().includes(term);
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto p-4">
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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold" id="products-heading">상품 목록</h2>
          <Link
            to="/products/new"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center space-x-2"
            aria-label="새 상품 등록하기"
          >
            <Plus size={20} />
            <span>상품 등록</span>
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-grow">
              <input 
                type="text" 
                placeholder="상품 검색..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full p-2 pl-10 border rounded-md"
                aria-label="상품 검색"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            
            <div className="flex-shrink-0">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="p-2 border rounded-md"
                aria-label="검색 필드 선택"
              >
                <option value="title">제목만</option>
                <option value="description">설명만</option>
                <option value="all">모든 필드</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading && products.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600">상품 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              새로고침
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-10">
            {searchTerm ? (
              <p className="text-gray-600">검색 결과가 없습니다.</p>
            ) : (
              <p className="text-gray-600">등록된 상품이 없습니다.</p>
            )}
          </div>
        ) : (
          <div 
            className="flex flex-col space-y-6"
            aria-labelledby="products-heading"
            role="region"
          >
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative"
                aria-label={`${sanitizeText(product.title)} - ${product.price.toLocaleString()}원`}
              >
                <div className="flex p-4 space-x-4">
                  <div className="w-24 h-24 flex-shrink-0">
                    <img
                      src={sanitizeText(product.imageUrl)}
                      alt=""
                      className="object-cover w-full h-full rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=이미지 없음';
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-between w-full min-w-0">
                    <h3 className="text-lg font-semibold mb-2 truncate" title={sanitizeText(product.title)}>
                      {sanitizeText(product.title)}
                    </h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 truncate" title={sanitizeText(product.author)}>
                        {sanitizeText(product.author)}
                      </span>
                    </div>
                    <p className="text-blue-600 font-semibold">
                      {product.price.toLocaleString()}원
                    </p>
                    <span className="absolute bottom-2 right-2 text-sm text-gray-500">
                      {format(new Date(product.createdAt), 'yyyy-MM-dd')}
                    </span>
                  </div>
                </div>
                {product.purchasedBy && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-sm font-semibold rounded-bl-lg">
                    구매 완료
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
