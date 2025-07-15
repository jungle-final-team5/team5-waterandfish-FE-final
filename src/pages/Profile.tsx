import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Hand, Trash2, Trophy, Target, Clock, Star, Mail } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import API from '@/components/AxiosInstance';
import { useAuth } from '@/hooks/useAuth';

// GET /user/profile 또는 /user/me
interface UserProfile {
  handedness: string,
  nickname: string;
}


const Profile = () => {
  const [nickname, setNickname] = useState('사용자');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dominantHand, setDominantHand] = useState('R');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isSocialUser, setIsSocialUser] = useState(false);
  const [handPreference, setHandPreference] = useState('right');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  // 사용자 정보 로드
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      console.log('🔍 사용자 데이터:', userData);
      
      setNickname(userData.nickname || '사용자');
      setUserEmail(userData.email || '');
      
      // 소셜 로그인 사용자 여부 확인 로직 단순화
      setIsSocialUser(Boolean(userData.provider));
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('handPreference');
    if (stored === 'left' || stored === 'right') {
      setHandPreference(stored);
    }
  }, []);

  // 임시 통계 데이터
  const stats = {
    totalLearned: 156,
    streak: 7,
    accuracy: 85,
    totalTime: 24
  };

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await API.get<UserProfile>('/user/me');
      setNickname(response.data.nickname);
      setDominantHand(response.data.handedness === 'R' ? 'R' : 'L');
      
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast({
          title: "오류",
          description: "사용자 정보를 불러올 수 없습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

    useEffect(() => {
    fetchUserProfile();
  }, []);


const handleProfileUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (newPassword && newPassword !== confirmPassword) {
    toast({
      title: "오류",
      description: "새 비밀번호가 일치하지 않습니다.",
      variant: "destructive",
    });
    return;
  }

  try {
    // 닉네임만 변경
    await API.put('/user/me', {
      nickname: nickname,
      handedness: dominantHand
    });

    // 닉네임을 localStorage에도 저장 (Home에서 반영되도록)
    localStorage.setItem('nickname', nickname);

    // 비밀번호 변경 요청 (입력된 경우만)
    if (newPassword) {
      await API.put('/user/password', {
        currentPassword,
        newPassword
      });
    }

    toast({
      title: "성공",
      description: "프로필이 성공적으로 업데이트되었습니다.",
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  } catch (error) {
    toast({
      title: "오류",
      description: error?.response?.data?.detail || "프로필 업데이트에 실패했습니다.",
      variant: "destructive",
    });
  }
};


  

  // 회원 탈퇴(이메일 검증 포함)
  const handleAccountDelete = async () => {
    if (!deleteEmail) {
      toast({
        title: "오류",
        description: "이메일을 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    if (deleteEmail !== userEmail) {
      toast({
        title: "오류",
        description: "등록된 이메일과 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      await API.delete('auth/delete-account', {
        data: { email: deleteEmail }
      } as any); // 타입 에러 방지용 as any
      toast({
        title: "탈퇴 완료",
        description: "계정이 성공적으로 삭제되었습니다.",
      });
      localStorage.clear();
      logout(); // 인증 상태 false로 명확히 변경
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error: any) {
      toast({
        title: "오류",
        description: error?.response?.data?.detail || "계정 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="mr-4 hover:bg-white/80 text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">마이페이지</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                    <User className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">{nickname}</h2>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {isSocialUser ? '소셜 로그인 사용자' : '일반 사용자'}
                  </Badge>
                  {userEmail && (
                    <p className="text-sm text-gray-600 mt-2">{userEmail}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Settings */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">설정</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Nickname Section */}
                  <div className="space-y-3">
                    <Label htmlFor="nickname" className="flex items-center text-sm font-medium text-gray-700">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      닉네임
                    </Label>
                    <Input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Password Change Section - 소셜 로그인 사용자가 아닌 경우에만 표시 */}
                  {!isSocialUser && (
                    <>
                      <div className="space-y-4">
                        <Label className="flex items-center text-sm font-medium text-gray-700">
                          <Lock className="h-4 w-4 mr-2 text-gray-500" />
                          비밀번호 변경
                        </Label>
                        
                        <div className="space-y-3">
                          <Input
                            type="password"
                            placeholder="현재 비밀번호"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <Input
                            type="password"
                            placeholder="새 비밀번호"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <Input
                            type="password"
                            placeholder="새 비밀번호 확인"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <Separator className="my-6" />
                    </>
                  )}

                  {/* Dominant Hand Section */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <Hand className="h-4 w-4 mr-2 text-gray-500" />
                      주 사용 손
                    </Label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dominantHand"
                          value="R"
                          checked={dominantHand === 'R'}
                          onChange={(e) => setDominantHand(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">오른손</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dominantHand"
                          value="L"
                          checked={dominantHand === 'L'}
                          onChange={(e) => setDominantHand(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">왼손</span>
                      </label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    설정 저장
                  </Button>
                </form>

                <Separator className="my-8" />

                {/* Delete Account Section */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-800 mb-2">위험 구역</h3>
                  <p className="text-red-600 text-sm mb-4">
                    계정을 삭제하면 모든 데이터가 영구적으로 사라집니다.
                  </p>
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        계정 탈퇴
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>계정 탈퇴</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          {isSocialUser && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700 text-sm">
                              💡 소셜 로그인 사용자는 등록된 이메일을 입력해주세요.
                            </div>
                          )}
                        </AlertDialogDescription>
                        <div className="mt-4">
                          <Label htmlFor="deleteEmail" className="text-sm font-medium">
                            이메일 확인
                          </Label>
                          <div className="relative mt-2">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="deleteEmail"
                              type="email"
                              placeholder="등록된 이메일을 입력하세요"
                              value={deleteEmail}
                              onChange={(e) => setDeleteEmail(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          {/* {userEmail && (
                            <p className="text-xs text-gray-500 mt-1">
                              등록된 이메일: {userEmail}
                            </p>
                          )} */}
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteEmail('')}>
                          취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleAccountDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          탈퇴하기
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div style={{ margin: '16px 0' }}>
        </div>
      </div>
    </div>
  );
};

export default Profile;