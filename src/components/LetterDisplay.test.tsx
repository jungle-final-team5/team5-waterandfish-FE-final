import { render } from '@testing-library/react';
import LetterDisplay from './LetterDisplay';

test('LetterDisplay가 정상적으로 렌더링된다', () => {
  render(<LetterDisplay isVowel={false} progress={1} />);
}); 