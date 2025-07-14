import API from "@/components/AxiosInstance";
import { useNavigate } from "react-router-dom";
import { useGlobalWebSocketStatus } from "@/contexts/GlobalWebSocketContext";
import { connectToWebSockets } from "./useWebsocket";
import { useState } from "react";

export const useChapterHandler = () => {
  const navigate = useNavigate();
  const { showStatus } = useGlobalWebSocketStatus();
  const [connectingChapter, setConnectingChapter] = useState<string | null>(null);
  const handleStartLearn = async (chapterId: string, lessonIds: string[]) => {
    const modeNum = 1;
    const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
    try {
      setConnectingChapter(chapterId);

      // 1. 챕터 프로그레스 초기화 API 호출 (user_chapter_progress, user_lesson_progress 생성)
      await API.post(`/progress/chapters/${chapterId}`);

      // 2. WebSocket 연결 시도
      try {
        const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
        if (response.data.success && response.data.data.ws_urls) {
          console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
          await connectToWebSockets(response.data.data.ws_urls);
          showStatus(); // 전역 상태 표시 활성화

          // 학습 진도 이벤트 기록
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'study' });

          // lesson_mapper를 URL state로 전달
          navigate(path, {
            state: {
              lesson_mapper: response.data.data.lesson_mapper
            }
          });
          return; // 성공적으로 처리되었으므로 함수 종료
        }
      } catch (wsError) {
        console.warn('WebSocket 연결 실패:', wsError);
        // WebSocket 연결 실패해도 페이지 이동은 계속 진행
      }

      setConnectingChapter(null);
      navigate(path);
    } catch (err) {
      console.error('학습 시작 실패:', err);
      setConnectingChapter(null);
      navigate(path); // 실패해도 이동
    }
  };

  const handleStartQuiz = async (chapterId: string, lessonIds: string[]) => {
    const modeNum = 2;
    const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
    try {
      setConnectingChapter(chapterId);

      // WebSocket 연결 시도
      try {
        const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
        if (response.data.success && response.data.data.ws_urls) {
          console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
          await connectToWebSockets(response.data.data.ws_urls);
          showStatus(); // 전역 상태 표시 활성화

          // 학습 진도 이벤트 기록
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'review' });

          // lesson_mapper를 URL state로 전달
          navigate(path, {
            state: {
              lesson_mapper: response.data.data.lesson_mapper
            }
          });
          return; // 성공적으로 처리되었으므로 함수 종료
        }
      } catch (wsError) {
        console.warn('WebSocket 연결 실패:', wsError);
        // WebSocket 연결 실패해도 페이지 이동은 계속 진행
      }

      setConnectingChapter(null);
      navigate(path);
    } catch (err) {
      console.error('학습 시작 실패:', err);
      setConnectingChapter(null);
      navigate(path); // 실패해도 이동
    }
  };

  return {
    connectingChapter,
    handleStartLearn,
    handleStartQuiz
  };
}