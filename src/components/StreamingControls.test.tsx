import { render } from '@testing-library/react';
import StreamingControls from './StreamingControls';

test('StreamingControls가 정상적으로 렌더링된다', () => {
  const mockConfig = { fps: 30, quality: 0.7, maxWidth: 320, maxHeight: 240 };
  render(
    <StreamingControls
      isStreaming={false}
      streamingStatus="idle"
      streamingConfig={mockConfig}
      currentStream={null}
      connectionStatus="disconnected"
      onStartStreaming={() => {}}
      onStopStreaming={() => {}}
      onConfigChange={() => {}}
      transitionSign={() => {}}
    />
  );
}); 