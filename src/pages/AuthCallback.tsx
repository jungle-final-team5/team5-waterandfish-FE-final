import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔗 AuthCallback 컴포넌트가 마운트되었습니다.');
    console.log('📍 현재 URL:', window.location.href);
    console.log('📋 현재 URL 파라미터:', Object.fromEntries(searchParams.entries()));
    
    // 쿼리스트링에서 사용자 정보 파싱
    const nickname = searchParams.get('nickname');
    const email = searchParams.get('email');
    const userId = searchParams.get('user_id');
    const handedness = searchParams.get('handedness');
    const streakDays = searchParams.get('streak_days');
    const overallProgress = searchParams.get('overall_progress');
    const description = searchParams.get('description');

    console.log('👤 추출된 사용자 정보:', { 
      nickname, 
      email, 
      userId,
      handedness,
      streakDays,
      overallProgress,
      description
    });

    if (nickname && email) {
      console.log('✅ 필수 사용자 정보 확인됨');
      
      try {
        // 기존 localStorage 초기화 (이전 로그인 정보 제거)
        localStorage.clear();
        console.log('🧹 localStorage 초기화 완료');
        
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
        
        console.log('💾 사용자 정보가 localStorage에 저장되었습니다:', userData);
        console.log('🏠 홈 화면으로 이동합니다...');
        
        // 약간의 지연을 두고 이동 (상태 업데이트를 위해)
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 100);
      } catch (error) {
        console.error('❌ 사용자 정보 저장 중 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
        navigate('/login');
      }
    } else {
      console.error('❌ 필수 사용자 정보가 없습니다.');
      console.error('필수 정보:', { nickname: !!nickname, email: !!email });
      alert('로그인 정보를 받아오지 못했습니다. 다시 시도해주세요.');
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