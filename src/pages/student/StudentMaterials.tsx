import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, FileText, Youtube, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function StudentMaterials() {
  const [materials, setMaterials] = useState([
    { id: 'm-1', title: 'Persamaan Linear Satu Variabel', subject: 'Matematika', type: 'VIDEO', date: '12 Sep 2026', isRead: false },
    { id: 'm-2', title: 'Himpunan & Diagram Venn', subject: 'Matematika', type: 'PDF', date: '15 Sep 2026', isRead: true },
  ]);

  const toggleRead = (id: string) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        const newVal = !m.isRead;
        if (newVal) toast.success('Materi ditandai sebagai selesai dipelajari');
        return { ...m, isRead: newVal };
      }
      return m;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Materi Pembelajaran</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((mat) => (
          <Card key={mat.id} className="hover:border-indigo-200 transition-colors flex flex-col h-full">
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mat.type === 'VIDEO' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                  {mat.type === 'VIDEO' ? <Youtube className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {mat.subject}
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2 cursor-pointer hover:text-indigo-600 transition-colors">{mat.title}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-2 mb-6">
                <BookOpen className="w-4 h-4" /> Diunggah pada {mat.date}
              </p>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <button 
                  onClick={() => toggleRead(mat.id)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    mat.isRead ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 ${mat.isRead ? 'fill-emerald-100' : ''}`} />
                  {mat.isRead ? 'Selesai Dipelajari' : 'Tandai Selesai'}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
