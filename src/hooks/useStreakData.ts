import { useEffect, useState } from "react";
import API from "@/components/AxiosInstance";

interface StreakApiResponse {
  studyDates: string[];
  currentStreak: number;
  longestStreak: number;
}

export function useStreakData() {
  const [studyDates, setStudyDates] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStreak() {
      setLoading(true);
      try {
        const res = await API.get<{ success: boolean; data: StreakApiResponse }>("/attendance/streak");
        // studyDates를 KST로 변환
        const studyDatesKST = res.data.data.studyDates.map(dateStr => {
          const utcDate = new Date(dateStr + "T00:00:00Z");
          const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
          const y = kstDate.getFullYear();
          const m = String(kstDate.getMonth() + 1).padStart(2, '0');
          const d = String(kstDate.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        });
        setStudyDates(studyDatesKST);
        setCurrentStreak(res.data.data.currentStreak);
        setLongestStreak(res.data.data.longestStreak);
      } catch (e) {
        setStudyDates([]);
        setCurrentStreak(0);
        setLongestStreak(0);
      } finally {
        setLoading(false);
      }
    }
    fetchStreak();
  }, []);

  return { studyDates, currentStreak, longestStreak, loading };
} 