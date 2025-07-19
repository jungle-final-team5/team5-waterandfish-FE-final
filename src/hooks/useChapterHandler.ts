import API from "@/components/AxiosInstance";
import { useNavigate } from "react-router-dom";
import { useGlobalWebSocketStatus } from "@/contexts/GlobalWebSocketContext";
import { connectToWebSockets } from "./useWebsocket";
import { useState } from "react";
import { Lesson } from "@/types/learning";
import { Chapter } from "@/types/learning";

export const useChapterHandler = () => {
    const navigate = useNavigate();
    const { showStatus } = useGlobalWebSocketStatus();
    const [connectingChapter, setConnectingChapter] = useState<string | null>(null);


    const handleStartLearnV2 = async (chapterId: string, origin?: string) => {
        console.log('[handleStartLearnV2] chapterId', chapterId);
        const chapter_data = await API.get<{ success: boolean; data: Chapter }>(`/chapters/v2/${chapterId}`);
        const chapter = chapter_data.data.data;
        const modeNum = chapter.course_type;
        const lessonIds = chapter.lesson_ids;
        const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
        try {
            setConnectingChapter(chapterId);
            await API.post(`/progress/chapters/${chapterId}`);
            // status를 'study'로 바꾸는 API 호출 부분 삭제
            try {
                const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
                if (response.data.success && response.data.data.ws_urls) {
                    console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
                    await connectToWebSockets(response.data.data.ws_urls);
                    showStatus();
                    await API.post('/progress/lessons/events', { lesson_ids: chapter.lesson_ids, mode: 'study' });
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
    }

    const handleStartLearn = async (chapterId: string, lessonIds: string[], origin?: string) => {
        const modeNum = 1;
        const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
        try {
            setConnectingChapter(chapterId);
            await API.post(`/progress/chapters/${chapterId}`);
            // status를 'study'로 바꾸는 API 호출 부분 삭제
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

    const handleStartReview = async (chapterId: string, lessonIds: string[], origin?: string) => {
        const modeNum = 3;
        const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
        try {
            setConnectingChapter(chapterId);
            try {
                // fetch wrong lessons
                const wrongLessons = await API.get<{ success: boolean; data: Lesson[] }>(`/progress/failures/${chapterId}`);
                if (wrongLessons.data.success && wrongLessons.data.data) {
                    lessonIds = wrongLessons.data.data.map((lesson) => lesson.id);
                }
                else {
                    alert('복습 대상 레슨이 없습니다.');
                    console.error('학습 시작 실패:', wrongLessons.data.data);
                    setConnectingChapter(null);
                    navigate(path, { state: origin ? { origin } : undefined });
                    return;
                }
                const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
                if (response.data.success && response.data.data.ws_urls) {
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

    const handleStartSingleLearn = async (lessonId: string, isAuthenticated: boolean = true) => {
        try {
            setConnectingChapter(lessonId);

            // WebSocket 연결 시도
            try {
                let response;
                if (isAuthenticated === true) {
                    response = await API.get<{ success: boolean; data: { ws_url: string }; message?: string }>(`/ml/deploy/lesson/${lessonId}`);
                } else {
                    response = await API.get<{ success: boolean; data: { ws_url: string }; message?: string }>(`/ml/public/deploy/lesson/${lessonId}`);
                }
                if (response.data.success && response.data.data.ws_url) {
                    await connectToWebSockets([response.data.data.ws_url]);
                    showStatus(); // 전역 상태 표시 활성화
                    navigate(`/learn/${lessonId}`);
                    return; // 성공적으로 처리되었으므로 함수 종료
                }
            } catch (wsError) {
                console.warn('WebSocket 연결 실패:', wsError);
                // WebSocket 연결 실패해도 페이지 이동은 계속 진행
            }

            // WebSocket 연결 실패 시에도 페이지 이동
            navigate(`/learn/${lessonId}`);
        } catch (err) {
            console.error('학습 시작 실패:', err);
            setConnectingChapter(null);
        }
    };


    return {
        connectingChapter,
        setConnectingChapter,
        handleStartLearn,
        handleStartQuiz,
        handleStartReview,
        handleStartSingleLearn,
        handleStartLearnV2
    };
};