
import API from '@/components/AxiosInstance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, Target, Calendar, Zap, Book, Heart, Crown, Flame, Shield } from 'lucide-react';
import { useEffect } from 'react';

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BadgeModal = ({ isOpen, onClose }: BadgeModalProps) => {
  const badges = [
    {
      id: 1,
      name: "첫 학습 완료",
      description: "첫 번째 수어를 성공적으로 학습했습니다",
      icon: <Trophy className="h-8 w-8 text-yellow-600" />,
      color: "bg-yellow-100",
      earned: true,
      earnedDate: "2024-01-15"
    },
    {
      id: 2,
      name: "일주일 연속 학습",
      description: "7일 연속으로 학습을 완료했습니다",
      icon: <Calendar className="h-8 w-8 text-green-600" />,
      color: "bg-green-100",
      earned: true,
      earnedDate: "2024-01-20"
    },
    {
      id: 3,
      name: "퀴즈 마스터",
      description: "퀴즈에서 10번 연속 정답을 맞혔습니다",
      icon: <Target className="h-8 w-8 text-blue-600" />,
      color: "bg-blue-100",
      earned: true,
      earnedDate: "2024-01-25"
    },
    {
      id: 4,
      name: "완벽주의자",
      description: "한 챕터를 100% 완료했습니다",
      icon: <Medal className="h-8 w-8 text-purple-600" />,
      color: "bg-purple-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 5,
      name: "수어 전문가",
      description: "100개의 수어를 학습했습니다",
      icon: <Award className="h-8 w-8 text-red-600" />,
      color: "bg-red-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 6,
      name: "스타 학습자",
      description: "한 달 연속 학습을 완료했습니다",
      icon: <Star className="h-8 w-8 text-orange-600" />,
      color: "bg-orange-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 7,
      name: "번개 학습자",
      description: "하루에 20개 이상의 수어를 학습했습니다",
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      color: "bg-yellow-50",
      earned: true,
      earnedDate: "2024-01-18"
    },
    {
      id: 8,
      name: "지식 탐험가",
      description: "모든 카테고리를 한 번씩 학습했습니다",
      icon: <Book className="h-8 w-8 text-indigo-600" />,
      color: "bg-indigo-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 9,
      name: "열정적인 학습자",
      description: "100일 연속 학습을 완료했습니다",
      icon: <Heart className="h-8 w-8 text-pink-600" />,
      color: "bg-pink-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 10,
      name: "수어 왕",
      description: "모든 챕터를 완료했습니다",
      icon: <Crown className="h-8 w-8 text-amber-600" />,
      color: "bg-amber-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 11,
      name: "연속 달성자",
      description: "30일 연속 학습 목표를 달성했습니다",
      icon: <Flame className="h-8 w-8 text-red-500" />,
      color: "bg-red-50",
      earned: true,
      earnedDate: "2024-02-10"
    },
    {
      id: 12,
      name: "수어 수호자",
      description: "친구 5명을 앱에 초대했습니다",
      icon: <Shield className="h-8 w-8 text-teal-600" />,
      color: "bg-teal-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 13,
      name: "실전 전문가",
      description: "실전 모드에서 50회 성공했습니다",
      icon: <Target className="h-8 w-8 text-cyan-600" />,
      color: "bg-cyan-100",
      earned: false,
      earnedDate: null
    },
    {
      id: 14,
      name: "복습 마스터",
      description: "복습 기능을 50회 사용했습니다",
      icon: <Book className="h-8 w-8 text-emerald-600" />,
      color: "bg-emerald-100",
      earned: true,
      earnedDate: "2024-02-05"
    },
    {
      id: 15,
      name: "속도왕",
      description: "10초 안에 정답을 맞춘 횟수 100회 달성",
      icon: <Zap className="h-8 w-8 text-violet-600" />,
      color: "bg-violet-100",
      earned: false,
      earnedDate: null
    }
  ]

  const earnedBadges = badges.filter(badge => badge.earned);
  const unearnedBadges = badges.filter(badge => !badge.earned);
    useEffect(() => {
    API.get('/badge/earned')  // FastAPI 주소에 맞게 수정
      .then(res => {
      console.log("응답 데이터:", res.data);  // 👈 여기 반드시 찍어보세요
    })
      .catch(err => {
    console.error('카테고리 불러오기 실패');
    if (err.response) {
      console.error('서버 응답 에러:', err.response.status, err.response.data);
    } else if (err.request) {
      console.error('요청은 전송됐지만 응답 없음:', err.request);
    } else {
      console.error('요청 설정 에러:', err.message);
    }
  });
  },[])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            🏆 획득한 뱃지
          </DialogTitle>
        </DialogHeader>
        
        {/* Earned Badges */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
            획득한 뱃지 ({earnedBadges.length}개)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {earnedBadges.map((badge) => (
              <div 
                key={badge.id}
                className={`${badge.color} rounded-xl p-6 transform hover:scale-105 transition-all duration-200`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-800">{badge.name}</h4>
                      <Badge variant="secondary" className="text-xs">획득</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                    <p className="text-xs text-gray-500">
                      획득일: {badge.earnedDate}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unearned Badges */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Target className="h-5 w-5 text-gray-400 mr-2" />
            도전 가능한 뱃지 ({unearnedBadges.length}개)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {unearnedBadges.map((badge) => (
              <div 
                key={badge.id}
                className="bg-gray-100 rounded-xl p-6 opacity-60 transform hover:scale-105 transition-all duration-200"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 filter grayscale">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-600">{badge.name}</h4>
                      <Badge variant="outline" className="text-xs">미획득</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{badge.description}</p>
                    <p className="text-xs text-gray-400">
                      계속 학습하여 이 뱃지를 획득해보세요!
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeModal;