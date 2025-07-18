import { useState, useEffect } from 'react';
import API from '@/components/AxiosInstance';

interface UseAnimationProps {
  lessonId?: string;
}

export const useAnimation = ({ lessonId }: UseAnimationProps) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isSlowMotion, setIsSlowMotion] = useState(false);

  // 애니메이션 재생 루틴
  const loadAnim = async (id: string) => {
    try {
      console.log(id);
      const response = await API.get(`/anim/${id}`, {
        responseType: 'blob'
      });

      const videoBlob = new Blob([response.data as BlobPart], { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(videoBlob);

      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      setVideoSrc(videoUrl);
    } catch (error) {
      console.error('애니메이션 불러오는데 실패했습니다 : ', error);
    }
  };

  // 재생 속도 제어
  useEffect(() => {
    const videoElement = document.querySelector('video[src]') as HTMLVideoElement;
    if (videoElement) {
      videoElement.playbackRate = isSlowMotion ? 0.5 : 1.0;
    }
  }, [isSlowMotion, videoSrc]);

  // lessonId 변경 시 애니메이션 자동 로드
  useEffect(() => {
    if (lessonId) {
      loadAnim(lessonId);
    }
  }, [lessonId]);

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);
  
  // 재생 속도 토글 함수
  const togglePlaybackSpeed = () => {
    setIsSlowMotion(prev => !prev);
  };

  return {
    videoSrc,
    loadAnim,
    isSlowMotion,
    togglePlaybackSpeed
  };
}; 