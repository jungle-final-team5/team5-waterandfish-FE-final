
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Hand, Trash2, Trophy, Target, Clock, Star } from 'lucide-react';
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

const Profile = () => {
  const [nickname, setNickname] = useState('사용자');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dominantHand, setDominantHand] = useState('right');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // 임시 통계 데이터
  const stats = {
    totalLearned: 156,
    streak: 7,
    accuracy: 85,
    totalTime: 24
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "오류",
        description: "새 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "성공",
      description: "프로필이 성공적으로 업데이트되었습니다.",
    });
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAccountDelete = () => {
    if (deletePassword !== '123456') {
      toast({
        title: "오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "탈퇴 완료",
      description: "계정이 성공적으로 삭제되었습니다.",
    });
    
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
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
                    활성 사용자
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">학습한 단어</p>
                      <p className="text-2xl font-bold">{stats.totalLearned}개</p>
                    </div>
                    <Target className="h-8 w-8 text-green-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">연속 학습</p>
                      <p className="text-2xl font-bold">{stats.streak}일</p>
                    </div>
                    <Trophy className="h-8 w-8 text-orange-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">정확도</p>
                      <p className="text-2xl font-bold">{stats.accuracy}%</p>
                    </div>
                    <Star className="h-8 w-8 text-purple-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">총 학습시간</p>
                      <p className="text-2xl font-bold">{stats.totalTime}시간</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-100" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">프로필 설정</CardTitle>
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

                  {/* Password Change Section */}
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

                  {/* Dominant Hand Section */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <Hand className="h-4 w-4 mr-2 text-gray-500" />
                      주로 사용하는 손
                    </Label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="hand"
                          value="right"
                          checked={dominantHand === 'right'}
                          onChange={(e) => setDominantHand(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">오른손</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="hand"
                          value="left"
                          checked={dominantHand === 'left'}
                          onChange={(e) => setDominantHand(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">왼손</span>
                      </label>
                    </div>
                  </div>

                  {/* Update Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base font-medium"
                  >
                    프로필 업데이트
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
                          <div className="mt-4">
                            <Label htmlFor="deletePassword" className="text-sm font-medium">
                              비밀번호 확인
                            </Label>
                            <Input
                              id="deletePassword"
                              type="password"
                              placeholder="비밀번호를 입력하세요"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletePassword('')}>
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
      </div>
    </div>
  );
};

export default Profile;