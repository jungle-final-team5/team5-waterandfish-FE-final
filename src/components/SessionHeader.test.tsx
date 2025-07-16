import { render } from '@testing-library/react';
import SessionHeader from './SessionHeader';

test('SessionHeader가 정상적으로 렌더링된다', () => {
  render(
    <SessionHeader
      currentMode={"테스트 모드!"}
      currentSign="테스트"
      chapterId={""}
      currentSignIndex={1}
      progress={1}
      categoryId={undefined}
      navigate={() => {}}
    />
  );
}); 