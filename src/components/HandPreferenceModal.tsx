import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import API from '@/components/AxiosInstance';

interface HandPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HandPreferenceModal = ({ isOpen, onClose }: HandPreferenceModalProps) => {
  const [selectedHand, setSelectedHand] = useState('right');
  const { toast } = useToast();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // 유저 정보에서 handedness 확인
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setShouldShow(user.handedness === null || user.handedness === undefined || user.handedness === "");
      } catch {
        setShouldShow(false);
      }
    } else {
      setShouldShow(false);
    }
  }, [isOpen]);

  if (!shouldShow) return null;

  const handleSave = async () => {
    // 로컬 스토리지에 손 선호도 저장
    localStorage.setItem('handPreference', selectedHand);
    localStorage.setItem('hasSetHandPreference', 'true');
    try {
      // 서버에 handedness 정보 PATCH (right → 'R', left → 'L')
      await API.put('/user/me', {
        handedness: selectedHand === 'right' ? 'R' : 'L'
      });
      toast({
        title: "설정 완료",
        description: `${selectedHand === 'right' ? '오른손' : '왼손'}으로 설정되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "서버에 손 선호도 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-blue-600">
            🤟 환영합니다!
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2">
            수어 학습을 위해 주로 사용하는 손을 선택해주세요.
            <br />
            언제든지 마이페이지에서 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <RadioGroup 
            value={selectedHand} 
            onValueChange={setSelectedHand}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <RadioGroupItem value="right" id="right" />
              <Label htmlFor="right" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">오른손</div>
                    <div className="text-sm text-gray-500">오른손을 주로 사용합니다</div>
                  </div>
                  <div className="text-2xl">✋</div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <RadioGroupItem value="left" id="left" />
              <Label htmlFor="left" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">왼손</div>
                    <div className="text-sm text-gray-500">왼손을 주로 사용합니다</div>
                  </div>
                  <div className="text-2xl">🤚</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            설정 완료
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HandPreferenceModal;