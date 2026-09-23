import React, { useState } from 'react';
import { Image as ImageIcon, Video, Music, ExternalLink, Maximize2, X, AlertCircle } from 'lucide-react';

interface QuestionMediaRendererProps {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  className?: string;
  compact?: boolean;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  
  // YouTube watch format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`;
  }
  
  // Direct embed check
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }
  
  return null;
}

export default function QuestionMediaRenderer({
  imageUrl,
  videoUrl,
  audioUrl,
  className = '',
  compact = false
}: QuestionMediaRendererProps) {
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!imageUrl && !videoUrl && !audioUrl) {
    return null;
  }

  const youtubeEmbedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <div className={`space-y-4 my-4 ${className}`}>
      {/* 1. Gambar */}
      {imageUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5 text-indigo-700">
              <ImageIcon className="w-4 h-4" /> Media Gambar Pendukung Soal
            </span>
            <button
              type="button"
              onClick={() => setShowImageZoom(true)}
              className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-[11px] font-medium"
              title="Perbesar gambar"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Perbesar
            </button>
          </div>

          <div className="flex justify-center bg-white rounded-lg p-2 border border-slate-100 overflow-hidden">
            {!imgError ? (
              <img
                src={imageUrl}
                alt="Gambar Pendukung Soal"
                className={`max-h-72 object-contain rounded-md transition-transform hover:scale-[1.01] cursor-pointer ${
                  compact ? 'max-h-48' : 'max-h-80'
                }`}
                onClick={() => setShowImageZoom(true)}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="p-4 text-center text-xs text-rose-600 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> Gagal memuat gambar dari URL yang diberikan.
                <a href={imageUrl} target="_blank" rel="noreferrer" className="underline text-indigo-600 flex items-center gap-1">
                  Buka link <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Video */}
      {videoUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5 text-rose-700">
              <Video className="w-4 h-4" /> Media Video Pendukung Soal
            </span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-rose-600 flex items-center gap-1 text-[11px] font-medium"
            >
              Buka di Tab Baru <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="rounded-lg overflow-hidden bg-black aspect-video max-h-80 mx-auto flex items-center justify-center">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title="Video Pendukung Soal"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              >
                Browser Anda tidak mendukung tag video HTML5.
              </video>
            )}
          </div>
        </div>
      )}

      {/* 3. Audio */}
      {audioUrl && (
        <div className="rounded-xl border border-slate-200 bg-amber-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-2">
            <span className="flex items-center gap-1.5">
              <Music className="w-4 h-4 text-amber-700" /> Dengarkan Rekaman Audio Pendukung Soal:
            </span>
            <a
              href={audioUrl}
              target="_blank"
              rel="noreferrer"
              className="text-amber-800 hover:text-amber-950 flex items-center gap-1 text-[11px] font-medium"
            >
              Link Audio <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-amber-200/70 shadow-xs">
            <audio
              controls
              className="w-full h-10 outline-none"
              src={audioUrl}
              preload="metadata"
            >
              Browser Anda tidak mendukung pemutar audio HTML5.
            </audio>
          </div>
        </div>
      )}

      {/* Image Modal Lightbox */}
      {showImageZoom && imageUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowImageZoom(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700">Gambar Soal (Resolusi Penuh)</span>
              <button
                onClick={() => setShowImageZoom(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center items-center overflow-auto max-h-[75vh]">
              <img
                src={imageUrl}
                alt="Gambar Soal Diperbesar"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
