import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import reportsData from '../db/reports.json';
import chatData from '../db/chat.json';
import usersData from '../db/users.json';
import productsData from '../db/products.json';
import { Report } from '../types';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

// API 모의 함수들
const updateReportsData = (newReports: Report[]) => {
  // 실제 앱에서는 API 호출일 것입니다
  reportsData.reports = [...newReports];
  // 비동기 동작을 시뮬레이션하기 위해 Promise 반환
  return Promise.resolve({ success: true });
};

const verifyAdminAndExecute = async (user: any, action: () => void) => {
  try {
    // 실제 환경에서는 실제 API 호출일 것입니다
    // 여기서는 간단히 사용자가 관리자인지 확인합니다
    if (user?.isAdmin) {
      action();
      return true;
    } else {
      toast.error('관리자 권한이 필요합니다.');
      return false;
    }
  } catch (error) {
    toast.error('권한 확인 중 오류가 발생했습니다.');
    return false;
  }
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>(reportsData.reports);
  const [banDuration, setBanDuration] = useState('7'); // 기본값 7일
  const [activeTab, setActiveTab] = useState<'products' | 'chat' | 'users' | 'banned'>('products');
  const [bannedUsers, setBannedUsers] = useState(usersData.users.filter(u => !u.canLogin)); // 차단된 사용자를 위한 상태

  const handleBanUser = (username: string) => {
    verifyAdminAndExecute(user, () => {
      try {
        const banExpiry = new Date();
        banExpiry.setDate(banExpiry.getDate() + parseInt(banDuration));
        
        // 데이터베이스에서 사용자의 차단 상태 업데이트
        const userIndex = usersData.users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
          usersData.users[userIndex] = {
            ...usersData.users[userIndex],
            canLogin: false,
            banExpiry: banExpiry.toISOString()
          };
        }

        // 차단된 사용자 상태 업데이트
        setBannedUsers(usersData.users.filter(u => !u.canLogin));

        // 관련 신고 제거
        const updatedReports = reports.filter(report => report.reportedUser !== username);
        updateReportsData(updatedReports)
          .then(() => {
            setReports(updatedReports);
            toast.success(`${username} 사용자가 ${banDuration}일 동안 차단되었습니다`);
          })
          .catch(() => {
            toast.error('신고 업데이트 중 오류가 발생했습니다');
          });
      } catch (error) {
        toast.error('사용자 차단 중 오류가 발생했습니다');
        console.error(error);
      }
    });
  };

  const handleUnbanUser = (username: string) => {
    verifyAdminAndExecute(user, () => {
      try {
        const userIndex = usersData.users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
          usersData.users[userIndex] = {
            ...usersData.users[userIndex],
            canLogin: true,
            banExpiry: undefined
          };

          // 차단된 사용자 상태 업데이트
          setBannedUsers(usersData.users.filter(u => !u.canLogin));

          toast.success(`${username} 사용자의 차단이 해제되었습니다`);
        }
      } catch (error) {
        toast.error('차단 해제 중 오류가 발생했습니다');
        console.error(error);
      }
    });
  };

  const handleDeleteContent = (report: Report) => {
    verifyAdminAndExecute(user, () => {
      try {
        if (report.type === 'chat') {
          // 채팅 메시지 삭제
          const messageIndex = chatData.messages.findIndex(msg => msg.id === report.contentId);
          if (messageIndex !== -1) {
            chatData.messages.splice(messageIndex, 1);
          } else {
            toast.error('메시지를 찾을 수 없습니다');
            return;
          }
        } else if (report.type === 'product') {
          // 상품 삭제
          const productIndex = productsData.products.findIndex(p => p.id === report.contentId);
          if (productIndex !== -1) {
            productsData.products[productIndex] = {
              ...productsData.products[productIndex],
              isDeleted: true
            };
          } else {
            toast.error('상품을 찾을 수 없습니다');
            return;
          }
        }

        // 신고 제거
        const updatedReports = reports.filter(r => r.id !== report.id);
        updateReportsData(updatedReports)
          .then(() => {
            setReports(updatedReports);
            toast.success('신고된 콘텐츠가 삭제되었습니다');
          })
          .catch(() => {
            toast.error('신고 업데이트 중 오류가 발생했습니다');
          });
      } catch (error) {
        toast.error('콘텐츠 삭제 중 오류가 발생했습니다');
        console.error(error);
      }
    });
  };

  const handleDismissReport = (reportId: string) => {
    verifyAdminAndExecute(user, () => {
      try {
        // 조치 없이 신고 제거
        const updatedReports = reports.filter(r => r.id !== reportId);
        updateReportsData(updatedReports)
          .then(() => {
            setReports(updatedReports);
            toast.success('신고가 기각되었습니다');
          })
          .catch(() => {
            toast.error('신고 업데이트 중 오류가 발생했습니다');
          });
      } catch (error) {
        toast.error('신고 기각 중 오류가 발생했습니다');
        console.error(error);
      }
    });
  };

  const filteredReports = reports.filter(report => {
    switch (activeTab) {
      case 'products':
        return report.type === 'product';
      case 'chat':
        return report.type === 'chat';
      case 'users':
        return report.type === 'user';
      default:
        return false;
    }
  });

  if (!user?.isAdmin) {
    return (
      <div className="text-center text-red-600">
        관리자 권한이 필요합니다.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">관리자 대시보드</h2>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'products'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            게시물 신고
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'chat'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            채팅 신고
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            사용자 신고
          </button>
          <button
            onClick={() => setActiveTab('banned')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'banned'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            차단된 사용자
          </button>
        </div>
        
        {activeTab === 'banned' ? (
          bannedUsers.length === 0 ? (
            <p className="text-gray-600">차단된 사용자가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {bannedUsers.map((bannedUser) => (
                <div key={bannedUser.username} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{bannedUser.username}</h3>
                      <p className="text-sm text-gray-500">
                        차단 해제일: {format(new Date(bannedUser.banExpiry!), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnbanUser(bannedUser.username)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      차단 해제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredReports.length === 0 ? (
          <p className="text-gray-600">신고된 내용이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {filteredReports.map((report) => {
              const reportedMessage = report.type === 'chat' && report.contentId
                ? chatData.messages.find(msg => msg.id === report.contentId)
                : null;
              const reportedProduct = report.type === 'product' && report.contentId
                ? productsData.products.find(p => p.id === report.contentId)
                : null;

              return (
                <div key={report.id} className="border-b pb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        신고된 {report.type === 'user' ? '사용자' : report.type === 'post' ? '게시글' : report.type === 'product' ? '상품' : '채팅'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        신고 시각: {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {report.type === 'user' ? (
                        <>
                          <select
                            value={banDuration}
                            onChange={(e) => setBanDuration(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="1">1일</option>
                            <option value="3">3일</option>
                            <option value="7">7일</option>
                            <option value="30">30일</option>
                          </select>
                          <button
                            onClick={() => handleBanUser(report.reportedUser)}
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                          >
                            차단
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDeleteContent(report)}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                          콘텐츠 삭제
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissReport(report.id)}
                        className="text-gray-500 hover:text-gray-700"
                        title="신고 기각"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>신고자:</strong> {report.reportedBy}</p>
                    <p><strong>신고 대상:</strong> {report.reportedUser}</p>
                    {reportedMessage && (
                      <p><strong>채팅 내용:</strong> {reportedMessage.content}</p>
                    )}
                    {reportedProduct && (
                      <>
                        <p><strong>상품명:</strong> {reportedProduct.title}</p>
                        <p><strong>가격:</strong> {reportedProduct.price.toLocaleString()}원</p>
                      </>
                    )}
                    <p><strong>신고 사유:</strong> {report.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
