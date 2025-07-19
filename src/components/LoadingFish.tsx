import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";

const LoadingFish = () => {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    fetch("/Fish Jumping.json")
      .then((res) => res.json())
      .then(setAnimationData);
  }, []);

  if (!animationData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <span className="text-blue-500 font-semibold text-lg">로딩 중입니다...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <div className="w-32 h-32">
        <Lottie animationData={animationData as object} loop />
      </div>
      <span className="mt-4 text-blue-500 font-semibold text-lg">로딩 중입니다...</span>
    </div>
  );
};

export default LoadingFish; 