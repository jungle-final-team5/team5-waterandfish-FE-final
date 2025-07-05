import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

import ExampleAnim from '@/components/ExampleAnim';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import { useLearningData } from '@/hooks/useLearningData';
import { Lesson } from '@/types/learning';
import { useVideoStream } from '../hooks/useVideoStream';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';
import SessionHeader from '@/components/SessionHeader';
import QuizDisplay from '@/components/QuizDisplay';
import LearningDisplay from '@/components/LearningDisplay';
import WebcamSection from '@/components/WebcamSection';
import { createPoseHandler } from '@/components/detect/usePoseHandler';
import HandDetectionIndicator from '@/components/HandDetectionIndicator';
import API from '@/components/AxiosInstance';
import WordSession from '@/pages/LearnSession';

import useWebsocket, { connectToWebSockets } from '@/hooks/useWebsocket';
import LearningGuide from './LearningGuide';
import WebSocketStatus from '@/components/WebSocketStatus';


const Session = () => {
  const { chapterId } = useParams();
  const { categories, findChapterById } = useLearningData();
  console.log('categories', categories);
  console.log('chapterId', chapterId);
  const chapter = findChapterById(chapterId);
  console.log('chapter', chapter);
  

  const isWSPrepare = useRef(false);
  const isWSStart = useRef(false);
  const isWSStop = useRef(false);
  const isWSDone = useRef(false);
  const isWSError = useRef(false);
  const isWSReset = useRef(false);
  const isWSResetDone = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isResetDone, setIsResetDone] = useState(false);
  // 전역 웹소켓 상태 사용
  const { connectionStatus, wsList, wsUrls } = useWebsocket(); // 전역 웹소켓 상태 사용

  const updateRecentLearning = async (lessonIds: string[]) => { // 최근 학습 이벤트 기록 업데이트 함수
    try {
      await API.post('/review/mark-reviewed', { lesson_ids: lessonIds });
    } catch (err) {
      console.error('최근학습 이벤트 기록 실패:', err);
    }
  };
  // 챕터 학습/퀴즈 시작 시 최근 학습 반영 (user_id를 body에 포함)


  const getWSURLsAndConnect = async (chapterId: string) => { // 웹소켓 URL 가져오고 연결 함수
    try {
      setIsLoading(true);
      const response = await API.get<{ success: boolean; data: { ws_urls: string[] }; message: string }>(`/ml/deploy/${chapterId}`);

      if (response.data.data.ws_urls) {
        const wsList = connectToWebSockets(response.data.data.ws_urls);

        alert(`WebSocket 연결 성공!\n연결된 서버: ${wsList.length}개`);
      } else {
        alert('WebSocket URL을 가져오지 못했습니다.');
      }
    } catch (err) {
      console.error('WebSocket 연결 실패:', err);
      alert('WebSocket 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chapterId) {
      getWSURLsAndConnect(chapterId);
    }
  }, [chapterId]);

  useEffect(() => {
    if (isError) {
      setIsError(false);
    }
  },[isError]);

  useEffect(() => {
    if (isReset) {
      setIsReset(false);
    }
  },[isReset]);

  useEffect(() => {
    if (isResetDone) {
      setIsResetDone(false);
    }
  },[isResetDone]);

  useEffect(() => {
    if (isDone) {
      setIsDone(false);
    }
  },[isDone]);

  useEffect(() => {
    if (isResetDone) {
      setIsResetDone(false);
    }
  },[isResetDone]);

  useEffect(() => {
    if (isResetDone) {
      setIsResetDone(false);
    }
  },[isResetDone]);
  
  useEffect(() => {
    if (isLoading) {
      setIsLoading(false);
    }
  },[isLoading]);




  return (
    <div>
      {/* 웹소켓 연결 상태 */}
      <WebSocketStatus
              chapterId={chapterId}
              onConnectionChange={(isConnected) => {
                console.log('WebSocket connection changed:', isConnected);
                // 연결 상태 변경 시 추가 처리 로직
              }}
            />
      <LearningGuide />
      <WordSession />
    </div>
  )
};

export default Session;