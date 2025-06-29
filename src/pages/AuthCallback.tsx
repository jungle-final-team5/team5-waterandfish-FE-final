import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('AuthCallback 컴포넌트가 마운트되었습니다.');
    console.log('현재 URL 파라미터:', Object.fromEntries(searchParams.entries()));
    
    // 쿼리스트링에서 사용자 정보 파싱
    const nickname = searchParams.get('nickname');
    const email = searchParams.get('email');
    const userId = searchParams.get('user_id');
    const handedness = searchParams.get('handedness');
    const streakDays = searchParams.get('streak_days');
    const overallProgress = searchParams.get('overall_progress');
    const description = searchParams.get('description');

    console.log('추출된 사용자 정보:', { 
      nickname, 
      email, 
      userId,
      handedness,
      streakDays,
      overallProgress,
      description
    });

    if (nickname && email) {
      // 기존 localStorage 초기화 (이전 로그인 정보 제거)
      localStorage.clear();
      
      // 사용자 정보를 localStorage에 저장
      const userData = {
        _id: userId,
        email: email,
        nickname: nickname,
        handedness: handedness,
        streak_days: streakDays ? parseInt(streakDays) : 0,
        overall_progress: overallProgress ? parseInt(overallProgress) : 0,
        description: description
      };

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('nickname', nickname);
      
      console.log('사용자 정보가 localStorage에 저장되었습니다:', userData);
      console.log('홈 화면으로 이동합니다...');
      navigate('/home');
    } else {
      console.error('사용자 정보가 없습니다. 로그인 페이지로 이동합니다.');
      navigate('/login');
    }
    // eslint-disable-next-line
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-700">로그인 처리 중...</p>
        <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
      </div>
    </div>
  );
};

export default AuthCallback;