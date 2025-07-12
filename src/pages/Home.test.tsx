import { render, screen } from '@testing-library/react';
import Home from './Home';

test('Home 페이지가 정상적으로 렌더링된다', () => {
  render(<Home />);
  expect(screen.getByText(/home|홈|메인/i)).toBeInTheDocument();
}); 