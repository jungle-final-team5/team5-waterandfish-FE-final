import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import * as React from "react";

interface SlideScaleProps {
  words: string[];
  currentIndex: number;
}

function SlideScale({ words, currentIndex }: SlideScaleProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(currentIndex);
  
  React.useEffect(() => {
    if (!api) {
      return;
    }
    
    // 현재 인덱스로 스크롤
    api.scrollTo(currentIndex);
    
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, currentIndex]);

  return (
    <Carousel
      setApi={setApi}
      className="w-full max-w-3xl"
      opts={{
        align: "center",
        loop: true,
      }}
    >
      <CarouselContent>
        {words.map((word, index) => (
          <CarouselItem key={index} className="basis-full">
            <div className="p-1">
              <Card>
                <CardContent className="flex items-center justify-center p-6">
                  <span className={cn(
                    "text-4xl font-bold",
                    index === currentIndex ? "text-blue-600" : "text-gray-400"
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