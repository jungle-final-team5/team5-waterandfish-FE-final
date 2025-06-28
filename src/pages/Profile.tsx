
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Hand, Trash2 } from 'lucide-react';
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

    // 프로필 업데이트 로직 (임시)
    toast({
      title: "성공",
      description: "프로필이 성공적으로 업데이트되었습니다.",
    });
    
    // 비밀번호 필드 초기화
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAccountDelete = () => {
    // 비밀번호 확인 (임시로 '123456'으로 설정)
    if (deletePassword !== '123456') {
      toast({
        title: "오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    // 계정 삭제 로직 (임시)
    toast({
      title: "탈퇴 완료",
      description: "계정이 성공적으로 삭제되었습니다.",
    });
    
    // 루트 페이지로 이동
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="mr-4 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">마이페이지</h1>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="flex items-center text-sm font-medium">
                <User className="h-4 w-4 mr-2" />
                닉네임
              </Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="py-3"
                required
              />
            </div>

            {/* Password Change */}
            <div className="space-y-4">
              <Label className="flex items-center text-sm font-medium">
                <Lock className="h-4 w-4 mr-2" />
                비밀번호 변경
              </Label>
              
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="현재 비밀번호"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="py-3"
                />
                <Input
                  type="password"
                  placeholder="새 비밀번호"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="py-3"
                />
                <Input
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="py-3"
                />
              </div>
            </div>

            {/* Dominant Hand */}
            <div className="space-y-2">
              <Label className="flex items-center text-sm font-medium">
                <Hand className="h-4 w-4 mr-2" />
                주로 사용하는 손
              </Label>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hand"
                    value="right"
                    checked={dominantHand === 'right'}
                    onChange={(e) => setDominantHand(e.target.value)}
                    className="mr-2"
                  />
                  오른손
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hand"
                    value="left"
                    checked={dominantHand === 'left'}
                    onChange={(e) => setDominantHand(e.target.value)}
                    className="mr-2"
                  />
                  왼손
                </label>
              </div>
            </div>

            {/* Update Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 py-3"
            >
              프로필 업데이트
            </Button>
          </form>

          {/* Delete Account */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
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
        </div>
      </div>
    </div>
  );
};

export default Profile;