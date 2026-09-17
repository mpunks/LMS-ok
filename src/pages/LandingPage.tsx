import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion } from 'motion/react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <BookOpen className="w-8 h-8" />
            <span>SmartLMS</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>Masuk</Button>
            <Button onClick={() => navigate('/login')}>Mulai Belajar</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            Tahun Ajaran Baru 2026/2027
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Platform Belajar Digital <br className="hidden md:block" />
            <span className="text-indigo-600">Sekolah Menengah Pertama</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistem manajemen pembelajaran modern terintegrasi yang memudahkan interaksi antara guru, siswa, dan materi pelajaran secara realtime dan tersinkronisasi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2" onClick={() => navigate('/login')}>
              Masuk ke Portal Siswa <ChevronRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login?tab=teacher')}>
              Portal Guru & Admin
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Fasilitas Pembelajaran Modern</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Kami menyediakan berbagai fitur untuk mendukung proses belajar mengajar yang efektif dan interaktif.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                title: 'Materi Terstruktur',
                desc: 'Akses modul pelajaran, video, dan ringkasan dengan pelacakan progres membaca.'
              },
              {
                icon: ShieldCheck,
                title: 'Ujian Berbasis Komputer',
                desc: 'Sistem CBT yang aman dengan timer dan fitur anti-kecurangan saat ujian.'
              },
              {
                icon: Users,
                title: 'Interaksi & Diskusi',
                desc: 'Forum tanya jawab langsung antara siswa dan guru untuk setiap topik pelajaran.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
