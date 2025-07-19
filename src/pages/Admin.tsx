import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Video } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningDataAdmin';
import { CategoryModal } from '@/components/CategoryModal';
import { ChapterModal } from '@/components/ChapterModal';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { Category, Chapter } from '@/types/learning';
import LessonManageModal from '@/components/LessonManageModal';
import API from '@/components/AxiosInstance';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory, addChapter, updateChapter, deleteChapter } = useLearningData();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [videoUploadModalOpen, setVideoUploadModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingChapter, setEditingChapter] = useState<{ chapter: Chapter; categoryId: string } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [lessonManageModalOpen, setLessonManageModalOpen] = useState(false);
  const { toast } = useToast();

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleEditChapter = (chapter: Chapter, categoryId: string) => {
    setEditingChapter({ chapter, categoryId });
    setChapterModalOpen(true);
  };

  const handleAddChapter = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingChapter(null);
    setChapterModalOpen(true);
  };

  const handleCategoryModalClose = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleChapterModalClose = () => {
    setChapterModalOpen(false);
    setEditingChapter(null);
    setSelectedCategoryId('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/home')}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">관리자 페이지</h1>
                <p className="text-sm text-gray-600">카테고리와 챕터를 관리하세요</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setLessonManageModalOpen(true)}
              >
                레슨 관리
              </Button>
              <Button onClick={() => setVideoUploadModalOpen(true)} variant="outline">
                <Video className="h-4 w-4 mr-2" />
                수어 영상 업로드
              </Button>
              <Button onClick={() => setCategoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                카테고리 추가
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className="bg-blue-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{category.title}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddChapter(category.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      챕터 추가
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        API.delete(`/category/${category.id}`)
                        deleteCategory(category.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {category.chapters.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>챕터명</TableHead>
                        <TableHead>타입</TableHead>
                        <TableHead>수어 개수</TableHead>
                        <TableHead className="w-32">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.chapters.map((chapter) => (
                        <TableRow key={chapter.id}>
                          <TableCell className="font-medium">{chapter.title}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${chapter.type === 'word'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                              }`}>
                              {chapter.type === 'word' ? '단어' : '문장'}
                            </span>
                          </TableCell>
                          <TableCell>{chapter.lessons.length}개</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditChapter(chapter, category.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  API.delete(`/chapters/${chapter.id}`)
                                  deleteChapter(category.id, chapter.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>아직 챕터가 없습니다.</p>
                    <p className="text-sm">위의 "챕터 추가" 버튼을 클릭해서 첫 번째 챕터를 만들어보세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <CategoryModal
        open={categoryModalOpen}
        onClose={handleCategoryModalClose}
        category={editingCategory}
        onSave={async (categoryData) => {
          if (editingCategory) {
            updateCategory(editingCategory.id, categoryData);
          } else {
            const res = await API.post("/category", categoryData);
            const createdCategory = res.data as { id: string };
            addCategory(categoryData, createdCategory.id);
            // API.post("/learning/category",categoryData);
          }
          handleCategoryModalClose();
        }}
      />
      <LessonManageModal
        open={lessonManageModalOpen}
        onClose={() => setLessonManageModalOpen(false)}
      />
      <ChapterModal
        open={chapterModalOpen}
        onClose={handleChapterModalClose}
        chapter={editingChapter?.chapter}
        categoryId={editingChapter?.categoryId || selectedCategoryId}
        onSave={async (chapterData, options) => {
          // options?.onlyLessonAdd === true 이면 수어만 추가하는 경우로 간주
          if (editingChapter) {
            updateChapter(editingChapter.categoryId, editingChapter.chapter.id, chapterData);
            const lessonIds = chapterData.signs.map(sign => sign.id);
            const courseTypeValue = chapterData.course_type === 'learn' ? 1 : 2;
            await API.post(`/chapters/${editingChapter.chapter.id}/lessons/connect`, { "chapter": editingChapter.chapter.id, "lesson": lessonIds, "course_type": courseTypeValue });
            if (!options?.onlyLessonAdd) {
              handleChapterModalClose();
            }
          } else {
            // 챕터 생성
            const lessonIds = chapterData.signs.map(sign => sign.id);
            try {
              const chapterRes = await API.post<Chapter>("/chapters/v2", {
                categoryid: selectedCategoryId,
                title: chapterData["title"],
                type: chapterData["type"],
                course_type: chapterData.course_type === 'learn' ? 1 : 2,
                lesson_ids: lessonIds
              });
              alert('챕터 생성 완료');
            } catch (error) {
              alert('챕터 생성 실패');
            }
            // v1 코드
            // const chapterId = (chapterRes.data as any).id;// ✅ ObjectId 문자열
            // addChapter(selectedCategoryId, chapterData, chapterId);
            // const courseTypeValue = chapterData.course_type === 'learn' ? 1 : 2;
            // await API.post(`/chapters/${chapterId}/lessons/connect`, { "chapter": chapterId, "lesson": lessonIds, "course_type": courseTypeValue });
            handleChapterModalClose();
          }
        }}
      />
      <VideoUploadModal
        open={videoUploadModalOpen}
        onClose={() => setVideoUploadModalOpen(false)}
        onSave={(videoData) => {
          // TODO: 실제 비디오 저장 로직 구현
          toast({
            title: "영상 업로드 완료",
            description: `"${videoData.label}" 영상이 성공적으로 업로드되었습니다.`,
          });
          setVideoUploadModalOpen(false);
        }}
      />
    </div>
  );
};

export default Admin;