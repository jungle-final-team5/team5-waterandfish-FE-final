
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Category } from '@/types/learning';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (data: { title: string; description: string; icon: string }) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ 
  open, 
  onClose, 
  category, 
  onSave 
}) => {
  const form = useForm({
    defaultValues: {
      title: category?.title || '',
      description: category?.description || '',
      icon: category?.icon || '📚'
    }
  });

  React.useEffect(() => {
    if (category) {
      form.reset({
        title: category.title,
        description: category.description,
        icon: category.icon
      });
    } else {
      form.reset({
        title: '',
        description: '',
        icon: '📚'
      });
    }
  }, [category, form]);

  const handleSubmit = (data: { title: string; description: string; icon: string }) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? '카테고리 수정' : '새 카테고리 추가'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 일상 인사말" {...field} />
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
                    <Input placeholder="카테고리에 대한 간단한 설명" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>아이콘 (이모지)</FormLabel>
                  <FormControl>
                    <Input placeholder="📚" {...field} maxLength={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit">
                {category ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
