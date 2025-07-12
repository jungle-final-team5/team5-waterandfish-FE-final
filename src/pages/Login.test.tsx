import { render } from '@testing-library/react';
import Login from './Login';

test('Login 페이지가 정상적으로 렌더링된다', () => {
  render(<Login />);
}); 