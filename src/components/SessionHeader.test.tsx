import { render } from '@testing-library/react';
import SessionHeader from './SessionHeader';

test('SessionHeader가 정상적으로 렌더링된다', () => {
  render(
    <SessionHeader
      isQuizMode={false}
      currentSign="테스트"
      chapter="테스트 챕터"
      currentSignIndex={1}
      progress={1}
      categoryId={undefined}
      navigate={() => {}}
    />
  );
}); 