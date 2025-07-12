import { render } from '@testing-library/react';
import FeedbackDisplay from './FeedbackDisplay';

test('FeedbackDisplay가 정상적으로 렌더링된다', () => {
  render(<FeedbackDisplay feedback="correct" prediction="테스트" />);
}); 