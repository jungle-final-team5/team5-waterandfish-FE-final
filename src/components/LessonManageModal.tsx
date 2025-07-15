import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types/learning';
import API from './AxiosInstance';

interface LessonManageModalProps {
  open: boolean;
  onClose: () => void;
}

const LessonManageModal: React.FC<LessonManageModalProps> = ({ open, onClose }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editModelInfo, setEditModelInfo] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newModelInfo, setNewModelInfo] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    if (open) {
      setLoading(true);
      API.get(`/lessons`)
        .then(res => {
          setLessons(res.data?.data?.lessons || []);
          setLoading(false);
        })
        .catch(() => {
          setLessons([]);
          setLoading(false);
        });
    }
    if (!open) {
      setLessons([]);
      setEditId(null);
    }
  }, [open]);

  const handleEdit = (lesson: Lesson) => {
    setEditId(lesson.id);
    setEditWord(lesson.word ?? '');
    setEditModelInfo(lesson.modelInfo ?? '');
    setEditUrl(lesson.url ?? '');
  };

  const handleEditSave = async (id: string) => {
    try {
      const lesson = lessons.find(l => l.id === id);
      if (!lesson) return;
      const updatedWord = editWord.trim() !== '' ? editWord : lesson.word;
      const updatedModelInfo = editModelInfo.trim() !== '' ? editModelInfo : lesson.modelInfo || '';
      const updatedUrl = editUrl.trim() !== '' ? editUrl : lesson.url || '';
      await API.patch(`/lessons/${id}`, {
        word: updatedWord,
        modelInfo: updatedModelInfo,
        url: updatedUrl,
      });
      setLessons(lessons.map(l => l.id === id ? { ...l, word: updatedWord, modelInfo: updatedModelInfo, url: updatedUrl } : l));
      setEditId(null);
    } catch (e) {
      alert('수정 실패');
    }
  };

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    try {
      const payload = {
        sign: newWord.trim(),
        word: newWord.trim(),
        modelInfo: newModelInfo,
        url: newUrl,
        type: 'word',
        description: '',
        order: 0,
        chapter: '',
      };
      const res = await API.post('/lessons', payload);
      setLessons([...lessons, res.data]);
      setNewWord('');
      setNewModelInfo('');
      setNewUrl('');
    } catch (e) {
      alert('추가 실패');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            레슨 관리
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div>로딩 중...</div>
          ) : (
            <>
              <div className="border-b pb-2 mb-2 font-semibold">레슨 목록</div>
              <div className="space-y-2">
                {lessons.map(lesson => (
                  <div key={lesson.id} className="flex items-center gap-2 border p-2 rounded">
                    {editId === lesson.id ? (
                      <>
                        <input
                          className="border px-2 py-1 rounded w-32"
                          value={editWord}
                          onChange={e => setEditWord(e.target.value)}
                        />
                        <input
                          className="border px-2 py-1 rounded w-32"
                          value={editModelInfo}
                          onChange={e => setEditModelInfo(e.target.value)}
                          placeholder="모델 정보"
                        />
                        <input
                          className="border px-2 py-1 rounded w-32"
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          placeholder="미디어 URL"
                        />
                        <Button size="sm" onClick={() => handleEditSave(lesson.id)}>저장</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}>취소</Button>
                      </>
                    ) : (
                      <>
                        <span className="w-32 truncate">{lesson.word}</span>
                        <span className="w-32 truncate text-gray-500">{lesson.modelInfo}</span>
                        <span className="w-32 truncate text-gray-500">{lesson.url}</span>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(lesson)}>수정</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="font-semibold mb-2">새 레슨 추가</div>
                <div className="flex gap-2">
                  <input
                    className="border px-2 py-1 rounded w-32"
                    value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    placeholder="단어"
                  />
                  <input
                    className="border px-2 py-1 rounded w-32"
                    value={newModelInfo}
                    onChange={e => setNewModelInfo(e.target.value)}
                    placeholder="모델 정보"
                  />
                  <input
                    className="border px-2 py-1 rounded w-32"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="미디어 URL"
                  />
                  <Button size="sm" onClick={handleAdd}>추가</Button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LessonManageModal;
