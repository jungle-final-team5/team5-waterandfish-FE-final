import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import * as React from "react";
import "./slidescale.css";

interface SlideScaleProps {
  words: string[];
  currentIndex: number;
  feedbackState?: 'default' | 'correct' | 'incorrect';
  onManualChange?: () => void; // Add this new prop
}



function SlideScale({ words, currentIndex, feedbackState = 'default', onManualChange }: SlideScaleProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [prevIndex, setPrevIndex] = React.useState(currentIndex);
  
  // 현재 인덱스가 변경될 때마다 해당 슬라이드로 이동
  React.useEffect(() => {
    if (api) {
      api.scrollTo(currentIndex);
    }
    setPrevIndex(currentIndex);
  }, [api, currentIndex]);

  // Listen for user-initiated slide changes
  React.useEffect(() => {
    if (!api || !onManualChange) return;
    
    const onSelect = () => {
      const currentSlide = api.selectedScrollSnap();
      // Only trigger if the change wasn't programmatic
      if (currentSlide !== prevIndex && currentSlide !== currentIndex) {
        onManualChange();
      }
    };
    
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, currentIndex, prevIndex, onManualChange]);

  // 피드백 상태에 따른 클래스 결정
  const getBorderClass = (index: number) => {
    if (index !== currentIndex) return "";
    
    let baseClass = "gradient-border";
    if (feedbackState === 'correct') return `${baseClass} correct`;
    if (feedbackState === 'incorrect') return `${baseClass} incorrect`;
    return baseClass;
  };

  return (
    <Carousel
      setApi={setApi}
      className="w-full max-w-3xl"
      opts={{
        align: "center",
        loop: true,
        dragFree: false,
      }}
    >
      <CarouselContent>
        {words.map((word, index) => (
          <CarouselItem key={index} className="basis-full">
            <div className="p-1">
              <Card className={getBorderClass(index)}>
                <CardContent className="flex items-center justify-center p-6 bg-white">
                  <span className={cn(
                    "text-4xl font-bold",
                    index === currentIndex ? 
                      feedbackState === 'correct' ? "text-green-600" : 
                      feedbackState === 'incorrect' ? "text-red-600" : 
                      "text-blue-600" 
                    : "text-gray-400"
                  )}>
                    {word}
                  </span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

export { SlideScale }
