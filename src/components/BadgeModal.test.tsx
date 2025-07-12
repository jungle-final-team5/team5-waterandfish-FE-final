import { render, screen } from '@testing-library/react';
import BadgeModal from './BadgeModal';

test('뱃지 모달이 제목을 표시한다', () => {
  render(<BadgeModal isOpen={true} onClose={() => {}} />);
  expect(screen.getByText(/뱃지/i)).toBeInTheDocument();
}); 