import { render } from '@testing-library/react';
import HandDetectionIndicator from './HandDetectionIndicator';

test('HandDetectionIndicator가 정상적으로 렌더링된다', () => {
  render(<HandDetectionIndicator isHandDetected={true} isConnected={true} isStreaming={true} />);
}); 