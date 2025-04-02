import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import usersData from '../db/users.json';
import { toast } from 'react-hot-toast';
import * as bcrypt from 'bcryptjs'; // 실제 환경에서는 서버 측에서 처리해야 함

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, password: string, bio: string) => Promise<boolean>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  updateBio: (newBio: string) => Promise<boolean>;
  updateBalance: (newBalance: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// 세션 관리를 위한 안전한 토큰 생성
const generateAuthToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// LocalStorage 래퍼 함수들 (오류 처리 포함)
const storage = {
  get: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  },
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('LocalStorage set error:', error);
      return false;
    }
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      return false;
    }
  }
};

// 모의 API
const api = {
  // 실제 환경에서는 이 로직이 서버에 위치해야 함
  login: async (username: string, password: string) => {
    const foundUser = usersData.users.find(u => u.username === username);
    
    if (!foundUser) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다');
    }
    
    // 실제로는 서버에서 해시 비교를 수행해야 함
    const passwordMatches = foundUser.password === password;
    if (!passwordMatches) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다');
    }
    
    if (!foundUser.canLogin) {
      const banExpiry = new Date(foundUser.banExpiry || '');
      if (banExpiry > new Date()) {
        const days = Math.ceil((banExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        throw new Error(`${days}일간 로그인하실 수 없습니다`);
      }
      // Ban expired, restore login ability
      foundUser.canLogin = true;
      foundUser.banExpiry = undefined;
    }
    
    // 민감한 정보 제외한 사용자 데이터 반환
    const { password: _, ...userWithoutPassword } = foundUser;
    return {
      user: userWithoutPassword,
      token: generateAuthToken()
    };
  },
  
  register: async (username: string, password: string, bio: string) => {
    if (usersData.users.some((u) => u.username === username)) {
      throw new Error('이미 존재하는 아이디입니다');
    }
    
    // 실제로는 비밀번호 해싱이 서버에서 수행되어야 함
    const newUser: User = {
      username,
      password, // 실제로는 해시된 비밀번호
      bio,
      canLogin: true,
      balance: 5000000
    };
    
    usersData.users.push(newUser);
    
    // 민감한 정보 제외한 사용자 데이터 반환
    const { password: _, ...userWithoutPassword } = newUser;
    return {
      user: userWithoutPassword,
      token: generateAuthToken()
    };
  },
  
  updatePassword: async (username: string, oldPassword: string, newPassword: string) => {
    const userIndex = usersData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      throw new Error('사용자를 찾을 수 없습니다');
    }
    
    const user = usersData.users[userIndex];
    
    // 실제로는 서버에서 해시 비교를 수행해야 함
    if (user.password !== oldPassword) {
      throw new Error('현재 비밀번호가 올바르지 않습니다');
    }
    
    // 실제로는 서버에서 비밀번호 해싱이 수행되어야 함
    usersData.users[userIndex] = {
      ...user,
      password: newPassword // 실제로는 해시된 비밀번호
    };
    
    // 민감한 정보 제외한 사용자 데이터 반환
    const { password: _, ...userWithoutPassword } = usersData.users[userIndex];
    return userWithoutPassword;
  },
  
  updateBio: async (username: string, newBio: string) => {
    const userIndex = usersData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      throw new Error('사용자를 찾을 수 없습니다');
    }
    
    usersData.users[userIndex] = {
      ...usersData.users[userIndex],
      bio: newBio
    };
    
    // 민감한 정보 제외한 사용자 데이터 반환
    const { password: _, ...userWithoutPassword } = usersData.users[userIndex];
    return userWithoutPassword;
  },
  
  updateBalance: async (username: string, newBalance: number) => {
    const userIndex = usersData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      throw new Error('사용자를 찾을 수 없습니다');
    }
    
    usersData.users[userIndex] = {
      ...usersData.users[userIndex],
      balance: newBalance
    };
    
    // 민감한 정보 제외한 사용자 데이터 반환
    const { password: _, ...userWithoutPassword } = usersData.users[userIndex];
    return userWithoutPassword;
  },
  
  getUser: async (username: string) => {
    const foundUser = usersData.users.find(u => u.username === username);
    
    if (!foundUser) {
      throw new Error('사용자를 찾을 수 없습니다');
    }
    
    // 민감한 정보 제외한 사용자 데이터 반환
    const { password: _, ...userWithoutPassword } = foundUser;
    return userWithoutPassword;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 사용자 세션 초기화
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const sessionData = storage.get('auth_session');
        
        if (sessionData && sessionData.token && sessionData.userId) {
          const userData = await api.getUser(sessionData.userId);
          if (userData) {
            setUser(userData as User);
          }
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        // 에러 발생 시 세션 초기화
        storage.remove('auth_session');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const updatedUser = await api.getUser(user.username);
      if (updatedUser) {
        setUser(updatedUser as User);
      }
    } catch (error) {
      console.error('User refresh error:', error);
      toast.error('사용자 정보를 갱신하는 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // 입력값 기본 검증
      if (!username.trim() || !password) {
        toast.error('아이디와 비밀번호를 입력해주세요');
        return false;
      }
      
      const result = await api.login(username, password);
      
      // 세션 저장 - 만료 기간을 1주일(7일)로 설정
      storage.set('auth_session', {
        userId: result.user.username,
        token: result.token,
        expiresAt: new Date().getTime() + (7 * 24 * 60 * 60 * 1000) // 7일(1주일)
      });
      
      setUser(result.user as User);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || '로그인 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // 세션 제거
      storage.remove('auth_session');
      setUser(null);
      
      // 실제 환경에서는 서버에도 로그아웃 요청
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, bio: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // 입력값 기본 검증
      if (!username.trim()) {
        toast.error('아이디를 입력해주세요');
        return false;
      }
      
      if (!password) {
        toast.error('비밀번호를 입력해주세요');
        return false;
      }
      
      if (password.length < 4) {
        toast.error('비밀번호는 최소 4자 이상이어야 합니다');
        return false;
      }
      
      await api.register(username, password, bio);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || '회원가입 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return false;
    }
    
    try {
      setIsLoading(true);
      
      // 입력값 기본 검증
      if (!oldPassword || !newPassword) {
        toast.error('모든 필드를 입력해주세요');
        return false;
      }
      
      if (newPassword.length < 4) {
        toast.error('새 비밀번호는 최소 4자 이상이어야 합니다');
        return false;
      }
      
      const updatedUser = await api.updatePassword(user.username, oldPassword, newPassword);
      setUser(updatedUser as User);
      return true;
    } catch (error) {
      console.error('Password update error:', error);
      toast.error(error.message || '비밀번호 변경 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBio = async (newBio: string): Promise<boolean> => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return false;
    }
    
    try {
      setIsLoading(true);
      
      if (newBio.length > 500) {
        toast.error('소개글은 500자를 초과할 수 없습니다');
        return false;
      }
      
      const updatedUser = await api.updateBio(user.username, newBio);
      setUser(updatedUser as User);
      return true;
    } catch (error) {
      console.error('Bio update error:', error);
      toast.error('소개글 수정 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBalance = async (newBalance: number): Promise<void> => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (isNaN(newBalance) || newBalance < 0) {
        toast.error('유효하지 않은 금액입니다');
        return;
      }
      
      const updatedUser = await api.updateBalance(user.username, newBalance);
      setUser(updatedUser as User);
    } catch (error) {
      console.error('Balance update error:', error);
      toast.error('잔액 업데이트 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading,
      login, 
      logout, 
      register, 
      updatePassword, 
      updateBio, 
      updateBalance,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
