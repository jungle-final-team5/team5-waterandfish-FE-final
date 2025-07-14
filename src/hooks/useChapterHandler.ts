import API from "@/components/AxiosInstance";
import { useNavigate } from "react-router-dom";
import { useGlobalWebSocketStatus } from "@/contexts/GlobalWebSocketContext";
import { connectToWebSockets } from "./useWebsocket";
import { useState } from "react";

export const useChapterHandler = () => {
  const navigate = useNavigate();
  const { showStatus } = useGlobalWebSocketStatus();
  const [connectingChapter, setConnectingChapter] = useState<string | null>(null);
  const handleStartLearn = async (chapterId: string, lessonIds: string[], origin?: string) => {
    const modeNum = 1;
    const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
    try {
      setConnectingChapter(chapterId);
      await API.post(`/progress/chapters/${chapterId}`);
      // 추가: 학습 시작 시 status를 'study'로 업데이트
      await API.post(`/progress/chapters/${chapterId}/lessons`, {
        lesson_ids: lessonIds,
        status: 'study',
      });
      try {
        const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
        if (response.data.success && response.data.data.ws_urls) {
          console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
          await connectToWebSockets(response.data.data.ws_urls);
          showStatus();
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'study' });
          navigate(path, {
            state: {
              lesson_mapper: response.data.data.lesson_mapper,
              ...(origin ? { origin } : {})
            }
          });
          return;
        }
      } catch (wsError) {
        console.warn('WebSocket 연결 실패:', wsError);
      }
      setConnectingChapter(null);
      navigate(path, { state: origin ? { origin } : undefined });
    } catch (err) {
      console.error('학습 시작 실패:', err);
      setConnectingChapter(null);
      navigate(path, { state: origin ? { origin } : undefined });
    }
  };

  const handleStartQuiz = async (chapterId: string, lessonIds: string[], origin?: string) => {
    const modeNum = 2;
    const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
    try {
      setConnectingChapter(chapterId);
      try {
        const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
        if (response.data.success && response.data.data.ws_urls) {
          console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
          await connectToWebSockets(response.data.data.ws_urls);
          showStatus();
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'review' });
          navigate(path, {
            state: {
              lesson_mapper: response.data.data.lesson_mapper,
              ...(origin ? { origin } : {})
            }
          });
          return;
        }
      } catch (wsError) {
        console.warn('WebSocket 연결 실패:', wsError);
      }
      setConnectingChapter(null);
      navigate(path, { state: origin ? { origin } : undefined });
    } catch (err) {
      console.error('학습 시작 실패:', err);
      setConnectingChapter(null);
      navigate(path, { state: origin ? { origin } : undefined });
    }
  };

  return {
    connectingChapter,
    setConnectingChapter,
    handleStartLearn,
    handleStartQuiz
  };
};