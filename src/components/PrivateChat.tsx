import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import chatData from '../db/chat.json';
import { ChatMessage } from '../types';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify'; // XSS 방지를 위한 패키지 (실제로는 추가 필요)

// 모의 API 함수들
const api = {
  getPrivateMessages: (currentUser: string, otherUser: string) => {
    const messages = chatData.messages.filter(msg => 
      msg.isPrivate && 
      ((msg.author === currentUser && msg.recipient === otherUser) ||
       (msg.author === otherUser && msg.recipient === currentUser))
    );
    return Promise.resolve([...messages]);
  },
  
  sendMessage: (message: ChatMessage) => {
    chatData.messages.push(message);
    return Promise.resolve({ success: true, message });
  },
  
  deleteMessage: (id: string, username: string) => {
    const message = chatData.messages.find(msg => msg.id === id);
    
    if (!message) {
      return Promise.reject({ success: false, error: "메시지를 찾을 수 없습니다." });
    }
    
    if (message.author !== username) {
      return Promise.reject({ success: false, error: "삭제 권한이 없습니다." });
    }
    
    chatData.messages = chatData.messages.filter(msg => msg.id !== id);
    return Promise.resolve({ success: true });
  },
  
  editMessage: (id: string, content: string, username: string) => {
    const message = chatData.messages.find(msg => msg.id === id);
    
    if (!message) {
      return Promise.reject({ success: false, error: "메시지를 찾을 수 없습니다." });
    }
    
    if (message.author !== username) {
      return Promise.reject({ success: false, error: "수정 권한이 없습니다." });
    }
    
    const updatedMessage = { ...message, content };
    chatData.messages = chatData.messages.map(msg => 
      msg.id === id ? updatedMessage : msg
    );
    
    return Promise.resolve({ success: true, message: updatedMessage });
  },
  
  checkUserExists: (username: string) => {
    // 실제로는 서버에서 사용자 존재 여부를 확인할 것입니다
    return Promise.resolve({ exists: true });
  }
};

// 텍스트 안전하게 처리하는 함수
const sanitizeText = (text: string) => {
  if (!text) return '';
  return DOMPurify.sanitize(text);
};

// 입력값 유효성 검사 함수
const validateInput = (text: string, minLength = 1, maxLength = 500) => {
  if (!text || text.trim().length < minLength) {
    return { isValid: false, error: `최소 ${minLength}자 이상 입력해주세요.` };
  }
  if (text.length > maxLength) {
    return { isValid: false, error: `최대 ${maxLength}자까지 입력 가능합니다.` };
  }
  return { isValid: true, error: null };
};

const PrivateChat = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 사용자 존재 여부 확인
  useEffect(() => {
    if (!username || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    api.checkUserExists(username)
      .then(response => {
        if (!response.exists) {
          setUserExists(false);
          setError(`사용자 ${username}을(를) 찾을 수 없습니다.`);
          toast.error(`사용자 ${username}을(를) 찾을 수 없습니다.`);
        } else {
          setUserExists(true);
        }
      })
      .catch(err => {
        console.error('사용자 확인 오류:', err);
        setError('사용자 정보를 확인하는 중 오류가 발생했습니다.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [username, user]);

  // 메시지 로드
  useEffect(() => {
    if (!username || !user || !userExists) return;
    
    setIsLoading(true);
    setError(null);
    
    api.getPrivateMessages(user.username, username)
      .then(privateMessages => {
        setMessages(privateMessages);
      })
      .catch(err => {
        console.error('메시지 로드 오류:', err);
        setError('메시지를 불러오는 중 오류가 발생했습니다.');
        toast.error('메시지를 불러오는 중 오류가 발생했습니다.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [username, user, userExists]);

  // 새 메시지 수신 시 스크롤 이동
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user) {
    return (
      <div className="text-center text-red-600" role="alert">
        로그인이 필요합니다.
      </div>
    );
  }

  if (!username) {
    navigate('/chat');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 유효성 검사
    const validation = validateInput(newMessage, 1, 500);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // XSS 방지를 위한 텍스트 정화
    const sanitizedMessage = sanitizeText(newMessage.trim());
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content: sanitizedMessage,
        author: user.username,
        recipient: username,
        createdAt: new Date().toISOString(),
        isPrivate: true
      };

      await api.sendMessage(message);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      toast.success('메시지가 전송되었습니다');
    } catch (err) {
      console.error('메시지 전송 오류:', err);
      setError('메시지 전송 중 오류가 발생했습니다.');
      toast.error('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 메시지를 삭제하시겠습니까?')) {
      return;
    }
    
    setIsDeleting(id);
    setError(null);
    
    try {
      await api.deleteMessage(id, user.username);
      setMessages(prev => prev.filter(msg => msg.id !== id));
      toast.success('메시지가 삭제되었습니다');
    } catch (err) {
      console.error('메시지 삭제 오류:', err);
      toast.error('메시지 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (message: ChatMessage) => {
    if (message.author !== user.username) {
      toast.error('본인이 작성한 메시지만 수정할 수 있습니다.');
      return;
    }
    
    setEditingId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async (id: string) => {
    // 입력 유효성 검사
    const validation = validateInput(editContent, 1, 500);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // XSS 방지를 위한 텍스트 정화
    const sanitizedContent = sanitizeText(editContent.trim());
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.editMessage(id, sanitizedContent, user.username);
      setMessages(prev => 
        prev.map(msg => msg.id === id ? { ...msg, content: sanitizedContent } : msg)
      );
      setEditingId(null);
      setEditContent('');
      toast.success('메시지가 수정되었습니다');
    } catch (err) {
      console.error('메시지 수정 오류:', err);
      toast.error('메시지 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 안전한 사용자 이름 표시
  const safeUsername = sanitizeText(username || '');

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" id="chat-heading">
            {safeUsername}님과의 1:1 채팅
          </h2>
          <Link 
            to="/chat" 
            className="text-blue-500 hover:text-blue-700"
            aria-label="채팅 목록으로 돌아가기"
          >
            ← 채팅 목록
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4" role="alert">
            {error}
          </div>
        )}
        
        {isLoading && messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">메시지를 불러오는 중...</p>
          </div>
        ) : !userExists ? (
          <div className="text-center py-10">
            <p className="text-red-500">사용자를 찾을 수 없습니다.</p>
          </div>
        ) : (
          <>
            <div 
              className="space-y-4 mb-6 max-h-[600px] overflow-y-auto p-2" 
              aria-labelledby="chat-heading"
              role="log"
            >
              {messages.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">아직 대화 내용이 없습니다. 첫 메시지를 보내보세요!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.author === user.username
                        ? 'bg-blue-100 ml-auto'
                        : 'bg-gray-100'
                    } ${message.author === user.username ? 'max-w-[80%] ml-auto' : 'max-w-[80%]'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        to={message.author === user.username ? '/profile' : `/user/${message.author}`}
                        className="font-semibold hover:text-blue-600"
                      >
                        {message.author}
                        {message.author === user.username && 
                          <span className="ml-2 text-xs text-blue-600">(나)</span>
                        }
                      </Link>
                      <span className="text-sm text-gray-500">
                        {format(new Date(message.createdAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    
                    {/* 수정 상태일 때 */}
                    {editingId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          maxLength={500}
                          rows={3}
                          aria-label="메시지 수정"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveEdit(message.id)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                            disabled={isLoading || !editContent.trim()}
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditContent('');
                            }}
                            className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
                            disabled={isLoading}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        {/* 본인 메시지일 때 수정/삭제 버튼 */}
                        {message.author === user.username && (
                          <div className="mt-2 text-sm space-x-2 flex justify-end">
                            <button
                              onClick={() => handleEdit(message)}
                              className="text-blue-600 hover:text-blue-800 disabled:text-blue-300"
                              disabled={!!isDeleting || !!editingId}
                              aria-label="메시지 수정"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(message.id)}
                              className="text-red-600 hover:text-red-800 disabled:text-red-300"
                              disabled={!!isDeleting || !!editingId}
                              aria-label="메시지 삭제"
                            >
                              {isDeleting === message.id ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 메시지 입력 폼 */}
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                maxLength={500}
                disabled={isSubmitting || !userExists}
                aria-label="메시지 입력"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isSubmitting || !newMessage.trim() || !userExists}
              >
                {isSubmitting ? '전송 중...' : '전송'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PrivateChat;
