import { render } from '@testing-library/react';
import ProgressModal from './ProgressModal';

test('ProgressModal이 정상적으로 렌더링된다', () => {
  render(<ProgressModal isOpen={true} onClose={() => {}} />);
}); 