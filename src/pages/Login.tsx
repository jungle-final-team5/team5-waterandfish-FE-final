
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 임시로 바로 홈 화면으로 이동 (추후 실제 인증 로직 구현)
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          메인으로 돌아가기
        </Button>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">🤟</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {isLogin ? 'SignSense 로그인' : 'SignSense 회원가입'}
            </h1>
            <p className="text-gray-600">
              {isLogin ? '수어 학습을 계속해보세요' : '새로운 수어 학습 여정을 시작하세요'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 py-3"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 py-3"
                required
              />
            </div>

            {!isLogin && (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="닉네임"
                  className="py-3"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    주로 사용하는 손
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input type="radio" name="hand" value="right" className="mr-2" defaultChecked />
                      오른손
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="hand" value="left" className="mr-2" />
                      왼손
                    </label>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg"
            >
              {isLogin ? '로그인' : '회원가입'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {isLogin 
                ? '계정이 없으신가요? 회원가입하기' 
                : '이미 계정이 있으신가요? 로그인하기'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
