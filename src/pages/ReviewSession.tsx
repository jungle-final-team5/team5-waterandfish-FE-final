import API from '@/components/AxiosInstance';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ReviewSession = () => {
    const { categoryId, chapterId, sessionType } = useParams();
    const [readyToQuiz, setReadyToQuiz] = useState(false);
    
  // L Q L Q
  // 예를 들어 퀴즈 수행에서 오답이 두 개 있었다고 해보자.
    // 그러면 [Anim이 표시된 복습 -> Quiz 수행하기] 이렇게가 플로우 한 개로 구성 되어 있다.
  // [애니메이션 보여주면서 따라하게 하고 - Quiz 수행하고] -> 이렇게 한 레슨(단어) 수행 완료

  // 필요한 것
  // 웹캠을 비롯한 채점 시스템 loader
    // 즉, 웹캠, 웹소켓, 채점 서버에 전송, 등등


  // psudo
   /*
   주어진 인자는 User, Chapter 정보만 있다.
   두 검색 조건을 인자로 DB User_Lesson_Progress에 있는 진행 상태를 전부 따져봐야함.
    검색 : User_Lesson_Progress에서
        조건 1 : UserID가 일치 할 것
        조건 2 : ChapterID가 일치 할 것
        조건 3 : 진행 상태가 review_required (또는 뭐 있겠지..) 류의 상태여야 할 것
    위의 검색 조건으로 인해 가져와진 데이터 들에 기반하여 복습 페이지를 준비하면 된다.
        // 복습도 어쨌든 Cam을 사용하니까 Guide 세션이 필요하고, Guide에서 미리 불러오는 형태도 가능할지?

    // 그 외에는 기존의 Session.tsx와 동일하게 구성.
    // 대신에 한 레슨에 대해 L Q를 해야함
    // Learning 때는 보여주고, 연이어서 Quiz를 수행
      @router.get("chapters/{chapter_id}/lessons")
      뚜구당땅 해서 목록 가져오고

      
      // 

    





   */ 

  const setModeToQuiz = () => {
    if(readyToQuiz) return;
    setReadyToQuiz(true);
  };

  const setNextLesson = () => {
    setReadyToQuiz(false);

    // 전 단어의 기록을 reviewed로 변경하기
    // 다음 단어 준비하기

  };

  useEffect(() => {
    // 우선 해야 할 내용들을 받아옴
    const response = API.get(`/progress/chapters/${chapterId}/lessons`);

    response.then((res) => {
      console.log(res.data);
    });
  }, []);


  
  if(readyToQuiz)
  {
    return (
      <div>이제 퀴즈를 해볼까요!! !???!??!? </div>
    );

  }
  else
  {
    return (
      <div>지금은 문제를 맞춰보고 있습니다?</div>
    );
  }

};

export default ReviewSession;
