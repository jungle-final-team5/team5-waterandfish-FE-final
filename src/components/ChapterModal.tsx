
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignWordSelector } from '@/components/SignWordSelector';
import { Chapter, Lesson } from '@/types/learning';
import API from './AxiosInstance';
interface ChapterModalProps {
  open: boolean;
  onClose: () => void;
  chapter?: Chapter | null;
  categoryId: string;
  onSave: (data: { title: string; type: 'word' | 'sentence'; signs: Lesson[]; course_type: 'learn' | 'quiz' }, options?: { onlyLessonAdd?: boolean }) => void;
}
interface LessonResponse {
  lessons: Lesson[];
}
export const ChapterModal: React.FC<ChapterModalProps> = ({ 
  open, 
  onClose, 
  chapter, 
  categoryId,
  onSave 
}) => {
  const [selectedSigns, setSelectedSigns] = useState<Lesson[]>(chapter?.lessons || []);
  const [allSigns, setAllSigns] = useState<Lesson[]>([]);
  const form = useForm({
    defaultValues: {
      title: chapter?.title || '',
      description: chapter?.description || '',
      type: chapter?.type || 'word' as 'word' | 'sentence',
      course_type: 'learn' as 'learn' | 'quiz'
    }
  });
  useEffect(() => {
    if (open) {
      API.get<{ lessons: Lesson[] }>('/lessons')
        .then(res => {
          const lessons = res.data?.data?.lessons;
          if (Array.isArray(lessons)) {
            setAllSigns(lessons);
          } else {
            setAllSigns([]);
          }
        })
        .catch(err => {
          console.error('레슨 로딩 실패:', err);
          setAllSigns([]);
        });
    }
  }, [open]);
  React.useEffect(() => {
    if (chapter) {
      form.reset({
        title: chapter.title,
        description: chapter.description || '',
        type: chapter.type,
        course_type: 'learn'
      });
      setSelectedSigns(chapter.lessons);
    } else {
      form.reset({
        title: '',
        description: '',
        type: 'word',
        course_type: 'learn'
      });
      setSelectedSigns([]);
    }
  }, [chapter, form]);

  const handleSubmit = (data: { title: string; description: string; type: 'word' | 'sentence'; course_type: 'learn' | 'quiz' }) => {
    onSave({
      ...data,
      signs: selectedSigns
    });
    form.reset();
    setSelectedSigns([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {chapter ? '챕터 수정' : '새 챕터 추가'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>챕터명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 기본 인사" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Input placeholder="챕터에 대한 설명을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>타입</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="챕터 타입을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="word">단어</SelectItem>
                      <SelectItem value="sentence">문장</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코스 타입</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="코스 타입을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="learn">학습 (Learn)</SelectItem>
                      <SelectItem value="quiz">퀴즈 (Quiz)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>수어 선택</FormLabel>
              <SignWordSelector
                selectedSigns={selectedSigns}
                onSelectionChange={(signs, isNewSignAdded) => {
                  setSelectedSigns(signs);
                  if (isNewSignAdded) {
                    onSave({
                      ...form.getValues(),
                      signs,
                    }, { onlyLessonAdd: true });
                  }
                }}
                categoryId={categoryId}
                lessons={allSigns || []}
                chapterTitle={form.watch('title')}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit">
                {chapter ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
