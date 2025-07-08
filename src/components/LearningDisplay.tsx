import ExampleAnim from '@/components/ExampleAnim';
import { useMemo } from 'react';
import styles from './LearningDisplay.module.css';

interface LearningDisplayProps {
  data: any;
  currentFrame: number;
  totalFrame: number;
}

const LearningDisplay = ({ data, currentFrame, totalFrame }: LearningDisplayProps) => {

  const progress = useMemo(() => {
    const  frame = currentFrame % totalFrame;
    return frame / totalFrame;
  }, [currentFrame, totalFrame]);

  return (
    <div className={styles['learning-display']} style={{ '--progress': progress } as React.CSSProperties}>
    <div className="space-y-4">
      <ExampleAnim data={data} currentFrame={currentFrame} showCylinders={true} showLeftHand={true} showRightHand={true} />
      </div>
    </div>
  );
};

export default LearningDisplay; 