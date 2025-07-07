import React from 'react';
import { useParams } from 'react-router-dom';

const ReviewSession = () => {
    const { categoryId, chapterId, sessionType } = useParams();
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
    위의 검색 조건으로 인해 
    





   */ 
  return <div>퀴즈 오답 복습 페이지 (추후 구현)</div>;
};

export default ReviewSession;
