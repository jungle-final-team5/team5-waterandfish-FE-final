import { useMemo, useState } from 'react';
import styles from './LearningDisplay.module.css';

interface LetterDisplayProps {
  isVowel: boolean;
  progress: number;
}

const LetterDisplay = ({ isVowel, progress  }: LetterDisplayProps) => {

const [filePath, setFilePath] = useState<string>("");

const imagePath = useMemo(() => {
    const baseFolder = isVowel ? 'vowel' : 'consonant';
    // progress에 따라 이미지 번호 결정 (예: 1부터 시작)
    const imageNumber = Math.max(1, Math.min(Math.floor(progress), 14)); // 1~19 범위로 제한
    
    // 이미지 경로 생성 (예: /images/vowelSet/1.png)
    return `/images/${baseFolder}/img${imageNumber}.png`;
  }, [isVowel, progress]);

  return (
    <div className={styles['learning-display']} style={{ '--progress': progress } as React.CSSProperties}>
      <div className="space-y-4">
        <div className="flex justify-center">
          <img 
            src={imagePath} 
            alt={`${isVowel ? '모음' : '자음'} 학습 이미지 ${Math.floor(progress)}`} 
            className="max-w-full h-auto rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
export default LetterDisplay; 