import React, { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2, Plus, CornerDownLeft, AlertCircle } from "lucide-react";

interface FileUploadZoneProps {
  onWordsExtracted: (words: string[], sourceName: string) => void;
  className?: string;
}

export default function FileUploadZone({ onWordsExtracted, className = "" }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert files to base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Keep only the base64 payload
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to read file as base64 string"));
        }
      };
      reader.onerror = (error) => reject(error);
    });

  const processFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const isImage = file.type.startsWith("image/");
      const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv");

      if (isImage) {
        setLoadingStage("正在读取并压缩图片...");
        const base64Data = await toBase64(file);
        setLoadingStage("正在使用 AI 识别并提取图片中的 English 单词...");

        const response = await fetch("/api/dictation/extract-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            mimeType: file.type,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "提取图片单词失败");
        }

        if (data.words && Array.isArray(data.words) && data.words.length > 0) {
          onWordsExtracted(data.words, `图片: ${file.name}`);
        } else {
          throw new Error("从该图片中未识别到明显的英文单词。请换张更清晰的图片试一下！");
        }
      } else if (isText) {
        setLoadingStage("正在读取文本内容...");
        const textContent = await file.text();

        // If the text is small and easy, we can extract it ourselves or use AI
        if (textContent.trim().length === 0) {
          throw new Error("文件内容为空。");
        }

        setLoadingStage("正在分析并清洗文件词库...");
        const response = await fetch("/api/dictation/extract-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textContent }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "提取文本单词失败");
        }

        if (data.words && Array.isArray(data.words) && data.words.length > 0) {
          onWordsExtracted(data.words, `输入: ${file.name}`);
        } else {
          throw new Error("从文件中未能提取到有效英文单词。");
        }
      } else {
        throw new Error("不支持此格式的文件。请上传图片（JPG/PNG/WEBP）或文本文件（TXT/CSV）。");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "文件导入出现错误，请重试");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const submitManualWords = () => {
    setError(null);
    if (!manualText.trim()) return;

    // Direct split by comma, newline, space
    const separated = manualText
      .split(/[\n,，;\s+]/)
      .map((w) => w.trim().replace(/[^a-zA-Z-]/g, "")) // keep alphabetic and hyphen
      .filter((w) => w.length > 1);

    if (separated.length === 0) {
      setError("请输入至少一个有效的英文单词。");
      return;
    }

    onWordsExtracted(separated, "手动粘贴导入");
    setManualText("");
  };

  return (
    <div id="file-uploader" className={`space-y-6 ${className}`}>
      {/* Drag & Drop Main Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 flex flex-col items-center justify-center text-center ${
          isDragging
            ? "border-emerald-500 bg-emerald-50/40DarkTheme:bg-emerald-950/20 shadow-inner scale-[0.99]"
            : "border-slate-200 hover:border-slate-300 bg-white"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.txt,.csv"
          className="hidden"
        />

        {loading ? (
          <div className="space-y-4 py-4">
            <Loader2 className="h-12 w-12 text-slate-400 stroke-[1.5] mx-auto animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700 animate-pulse">{loadingStage}</p>
              <p className="text-xs text-slate-400">正在调用 Gemini 模型解析，这可能需要 3-8 秒...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 transition-transform duration-300 hover:scale-105">
              <Upload className="h-8 w-8 stroke-[1.5]" />
            </div>

            <div>
              <p className="text-base font-semibold text-slate-800">
                拖拽图片或词汇表文件到此，或者<span className="text-indigo-600 hover:text-indigo-500 transition-colors"> 点击浏览</span>
              </p>
              <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto">
                支持单词卡片照、手写单词照片、印有例句的真题书照片 (PNG, JPG, WEBP)，以及 TXT/CSV 纯文本词单。
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100">
                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                智能图片识别 OCR
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                词汇文本导入
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100/60 rounded-xl flex gap-3 text-rose-700 items-start text-sm">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">操作没能成功</p>
            <p className="text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* Manual Paste Word Input */}
      <div className="bg-slate-55 border border-slate-100/80 rounded-2xl p-5 bg-white space-y-3.5">
        <label htmlFor="manual-paste" className="block text-sm font-semibold text-slate-700">或者直接粘贴英文单词列表</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="manual-paste"
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="例如: establish, persevere, dynamic（支持空格、逗号或回车分隔）"
              onKeyDown={(e) => e.key === "Enter" && submitManualWords()}
              className="w-full pl-4 pr-11 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={submitManualWords}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
              title="按回车键或点击导入"
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={submitManualWords}
            disabled={!manualText.trim()}
            className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 transition-colors rounded-xl font-medium text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="h-4 w-4" />
            导入
          </button>
        </div>
      </div>
    </div>
  );
}
