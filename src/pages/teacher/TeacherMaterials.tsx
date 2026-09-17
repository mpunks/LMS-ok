import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Plus, MoreVertical, FileText, Youtube } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function TeacherMaterials() {
  const [materials, setMaterials] = useState([
    { id: 'm-1', title: 'Persamaan Linear Satu Variabel', class: '7A', type: 'VIDEO', date: '12 Sep 2026' },
    { id: 'm-2', title: 'Himpunan & Diagram Venn', class: '7B', type: 'PDF', date: '15 Sep 2026' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Materi Belajar</h1>
        <Button className="gap-2 shrink-0" onClick={() => toast.info('Fitur tambah materi segera hadir.')}>
          <Plus className="w-4 h-4" /> Tambah Materi Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((mat) => (
          <Card key={mat.id} className="hover:border-indigo-200 transition-colors cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mat.type === 'VIDEO' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                  {mat.type === 'VIDEO' ? <Youtube className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  Kelas {mat.class}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{mat.title}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Ditambahkan pada {mat.date}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
