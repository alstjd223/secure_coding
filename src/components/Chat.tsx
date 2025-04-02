import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import chatData from '../db/chat.json';
import reportsData from '../db/reports.json';
import { ChatMessage } from '../types';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify'; // XSS 방지를 위한 패키지 (실제로는 추가 필요)

// 모의 API 함수
const api = {
  getMessages: () => {
    return Promise.resolve([...chatData.messages]);
  },
  sendMessage: (message: ChatMessage) => {
    chatData.messages.push(message);
    return Promise.resolve({ success: true, message });
  },
  deleteMessage: (id: string, username: string, isAdmin: boolean) => {
    const message = chatData.messages.find(msg => msg.id === id);
    
    // 메시지가 존재하지 않는 경우
    if (!message) {
      return Promise.reject({ success: false, error: "메시지를 찾을 수 없습니다." });
    }
    
    // 권한 확인 (작성자 또는 관리자만 삭제 가능)
    if (message.author !== username && !isAdmin) {
      return Promise.reject({ success: false, error: "삭제 권한이 없습니다." });
    }
    
    chatData.messages = chatData.messages.filter(msg => msg.id !== id);
    return Promise.resolve({ success: true });
  },
  editMessage: (id: string, content: string, username: string) => {
    const message = chatData.messages.find(msg => msg.id === id);
    
    // 메시지가 존재하지 않는 경우
    if (!message) {
      return Promise.reject({ success: false, error: "메시지를 찾을 수 없습니다." });
    }
    
    // 작성자만 수정 가능
    if (message.author !== username) {
      return Promise.reject({ success: false, error: "수정 권한이 없습니다." });
    }
    
    chatData.messages = chatData.messages.map(msg => 
      msg.id === id ? { ...msg, content } : msg
    );
    return Promise.resolve({ success: true, message: { ...message, content } });
  },
  reportMessage: (report: any) => {
    reportsData.reports.push(report);
    return Promise.resolve({ success: true });
  }
};

// 텍스트에서 XSS 스크립트를 제거하는 함수
const sanitizeText = (text: string) => {
  return DOMPurify.sanitize(text);
};

// 입력 유효성 검사 함수
const validateInput = (text: string, minLength = 1, maxLength = 1000) => {
  if (!text || text.trim().length < minLength) {
    return { isValid: false, error: `최소 ${minLength}자 이상 입력해주세요.` };
  }
  if (text.length > maxLength) {
    return { isValid: false, error: `최대 ${maxLength}자까지 입력 가능합니다.` };
  }
  return { isValid: true, error: null };
};

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(false);

  // 메시지 로드
  useEffect(() => {
    setIsLoading(true);
    api.getMessages()
      .then(messages => {
        setMessages(messages);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("메시지 로드 오류:", error);
        toast.error("메시지를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      });
  }, []);

  if (!user) {
    return (
      <div className="text-center text-red-600">
        로그인이 필요합니다.
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 유효성 검사
    const validation = validateInput(newMessage, 1, 500);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // XSS 방지를 위한 텍스트 정화
    const sanitizedMessage = sanitizeText(newMessage.trim());
    
    setIsLoading(true);
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      content: sanitizedMessage,
      author: user.username,
      createdAt: new Date().toISOString(),
      isPrivate: false
    };

    api.sendMessage(message)
      .then(() => {
        setMessages(prevMessages => [...prevMessages, message]);
        setNewMessage('');
        toast.success('메시지가 전송되었습니다');
      })
      .catch(error => {
        console.error("메시지 전송 오류:", error);
        toast.error("메시지 전송 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleDelete = (id: string) => {
    setIsLoading(true);
    api.deleteMessage(id, user.username, user?.isAdmin || false)
      .then(() => {
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== id));
        toast.success('메시지가 삭제되었습니다');
      })
      .catch(error => {
        console.error("메시지 삭제 오류:", error);
        toast.error(error.error || "메시지 삭제 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleEdit = (message: ChatMessage) => {
    // 본인 메시지만 수정 가능
    if (message.author !== user.username) {
      toast.error("본인이 작성한 메시지만 수정할 수 있습니다.");
      return;
    }
    setEditingId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = (id: string) => {
    // 입력 유효성 검사
    const validation = validateInput(editContent, 1, 500);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // XSS 방지를 위한 텍스트 정화
    const sanitizedContent = sanitizeText(editContent.trim());
    
    setIsLoading(true);
    api.editMessage(id, sanitizedContent, user.username)
      .then(response => {
        setMessages(prevMessages => 
          prevMessages.map(msg => msg.id === id ? { ...msg, content: sanitizedContent } : msg)
        );
        setEditingId(null);
        setEditContent('');
        toast.success('메시지가 수정되었습니다');
      })
      .catch(error => {
        console.error("메시지 수정 오류:", error);
        toast.error(error.error || "메시지 수정 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleReport = (message: ChatMessage) => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }

    // 자신의 메시지는 신고할 수 없음
    if (message.author === user.username) {
      toast.error('자신의 메시지는 신고할 수 없습니다');
      return;
    }

    // 입력 유효성 검사
    const validation = validateInput(reportReason, 5, 200);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // XSS 방지를 위한 텍스트 정화
    const sanitizedReason = sanitizeText(reportReason.trim());
    
    setIsLoading(true);
    const report = {
      id: crypto.randomUUID(),
      type: 'chat' as const,
      contentId: message.id,
      reportedUser: message.author,
      reason: sanitizedReason,
      reportedBy: user.username,
      createdAt: new Date().toISOString()
    };

    api.reportMessage(report)
      .then(() => {
        setReportingId(null);
        setReportReason('');
        toast.success('신고가 접수되었습니다');
      })
      .catch(error => {
        console.error("신고 접수 오류:", error);
        toast.error("신고 접수 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const publicMessages = messages.filter(msg => !msg.isPrivate);
  const privateChats = Array.from(new Set(messages
    .filter(msg => msg.isPrivate && (msg.author === user.username || msg.recipient === user.username))
    .map(msg => msg.author === user.username ? msg.recipient : msg.author)));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'public'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            disabled={isLoading}
          >
            실시간 채팅
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'private'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            disabled={isLoading}
          >
            1:1 채팅
          </button>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <p>로딩 중...</p>
          </div>
        )}

        {activeTab === 'public' ? (
          <>
            <h2 className="text-2xl font-bold mb-6">실시간 채팅</h2>
            <div className="space-y-4 mb-6 max-h-[600px] overflow-y-auto">
              {publicMessages.map((message) => (
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
                      {format(new Date(message.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  
                  {editingId === message.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        maxLength={500}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveEdit(message.id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                          disabled={isLoading}
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                          disabled={isLoading}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>{message.content}</p>
                      <div className="flex space-x-2 mt-2">
                        {message.author === user.username ? (
                          <>
                            <button
                              onClick={() => handleEdit(message)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                              disabled={isLoading}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(message.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                              disabled={isLoading}
                            >
                              삭제
                            </button>
                          </>
                        ) : user?.isAdmin ? (
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                            disabled={isLoading}
                          >
                            삭제
                          </button>
                        ) : (
                          <button
                            onClick={() => setReportingId(message.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                            disabled={isLoading}
                          >
                            신고하기
                          </button>
                        )}
                      </div>

                      {reportingId === message.id && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="신고 사유를 입력하세요... (최소 5자 이상)"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows={3}
                            maxLength={200}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleReport(message)}
                              className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                              disabled={isLoading || !reportReason.trim() || reportReason.trim().length < 5}
                            >
                              신고하기
                            </button>
                            <button
                              onClick={() => {
                                setReportingId(null);
                                setReportReason('');
                              }}
                              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                              disabled={isLoading}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                maxLength={500}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                disabled={isLoading || !newMessage.trim()}
              >
                전송
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">1:1 채팅 목록</h2>
            {privateChats.length === 0 ? (
              <p className="text-gray-600">진행 중인 1:1 채팅이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {privateChats.map(username => {
                  const lastMessage = messages
                    .filter(msg => 
                      msg.isPrivate && 
                      ((msg.author === username && msg.recipient === user.username) ||
                       (msg.author === user.username && msg.recipient === username))
                    )
                    .sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];

                  return (
                    <Link
                      key={username}
                      to={`/chat/${username}`}
                      className="block p-4 rounded-md hover:bg-gray-100 border"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold">{username}</span>
                          {lastMessage && (
                            <p className="text-sm text-gray-600 mt-1">
                              {lastMessage.content.length > 30 
                                ? lastMessage.content.substring(0, 30) + '...' 
                                : lastMessage.content}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {lastMessage && format(new Date(lastMessage.createdAt), 'MM/dd HH:mm')}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
