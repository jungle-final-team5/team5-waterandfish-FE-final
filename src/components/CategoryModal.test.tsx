import { render } from '@testing-library/react';
import { CategoryModal } from './CategoryModal';

test('CategoryModal이 정상적으로 렌더링된다', () => {
  render(<CategoryModal open={true} onClose={() => {}} onSave={() => {}} />);
}); 