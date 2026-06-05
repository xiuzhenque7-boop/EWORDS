import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Settings, 
  Trophy, 
  Award, 
  Trash2, 
  Play, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Volume2, 
  Layers, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Search, 
  VolumeX, 
  Check, 
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CornerDownLeft,
  Calendar,
  ChevronRight,
  RefreshCw,
  BookmarkCheck,
  Edit2
} from "lucide-react";
import FileUploadZone from "./components/FileUploadZone";
import { WordDetail, WordList, MistakeWord, DictationSession } from "./types";
import { PRESET_WORDS_1, PRESET_WORDS_2 } from "./utils/presets";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"library" | "dictation" | "mistakes">("library");

  // Vocabulary Lists & Mistakes Store
  const [lists, setLists] = useState<WordList[]>([]);
  const [mistakes, setMistakes] = useState<MistakeWord[]>([]);

  // Selected List for browsing / Editing
  const [selectedListId, setSelectedListId] = useState<string>("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // AI OCR extracted word drafting space
  const [extractedDraft, setExtractedDraft] = useState<{
    words: string[];
    sourceName: string;
    customTitle: string;
  } | null>(null);

  // AI Detail generation state
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Active Dictation Session State
  const [session, setSession] = useState<DictationSession | null>(null);
  const [dictationInput, setDictationInput] = useState("");
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [feedbackIsCorrect, setFeedbackIsCorrect] = useState(false);
  const [showDefinitionHint, setShowDefinitionHint] = useState(false);
  const [mistakesThisSession, setMistakesThisSession] = useState<WordDetail[]>([]);

  // Manual Add individual word to a list modal / state
  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [newWordSpelling, setNewWordSpelling] = useState("");
  const [isAddingSingleWord, setIsAddingSingleWord] = useState(false);

  // Flashcard review state for Mistakes
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const storedLists = localStorage.getItem("lexiscan_lists");
      if (storedLists) {
        setLists(JSON.parse(storedLists));
      } else {
        // Build initial preset lists for immediate premium showcase
        const initialLists: WordList[] = [
          {
            id: "preset-list-1",
            title: "必背核心词（基础篇）",
            description: "涵盖学术、日常交流高频动词与形容词，完美打底词汇基础",
            words: PRESET_WORDS_1,
            createdAt: Date.now() - 86400000,
          },
          {
            id: "preset-list-2",
            title: "高频学术词（突破篇）",
            description: "精选托福、雅思等写作及阅读高频核心必备词汇",
            words: PRESET_WORDS_2,
            createdAt: Date.now() - 3600000 * 12,
          }
        ];
        setLists(initialLists);
        localStorage.setItem("lexiscan_lists", JSON.stringify(initialLists));
      }

      // Load mistakes
      const storedMistakes = localStorage.getItem("lexiscan_mistakes");
      if (storedMistakes) {
        setMistakes(JSON.parse(storedMistakes));
      } else {
        // Initial mock mistakes for aesthetic display in mockup lists
        const placeholderMistakes: MistakeWord[] = [
          {
            word: "challenge",
            wrongAttempts: 2,
            lastAttemptAt: Date.now() - 3600000 * 2,
            mastered: false,
            detail: PRESET_WORDS_1[1]
          },
          {
            word: "persist",
            wrongAttempts: 1,
            lastAttemptAt: Date.now() - 3600000 * 4,
            mastered: false,
            detail: PRESET_WORDS_1[4]
          }
        ];
        setMistakes(placeholderMistakes);
        localStorage.setItem("lexiscan_mistakes", JSON.stringify(placeholderMistakes));
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

  // Save updates helper
  const saveListsToStorage = (updatedLists: WordList[]) => {
    setLists(updatedLists);
    localStorage.setItem("lexiscan_lists", JSON.stringify(updatedLists));
  };

  const saveMistakesToStorage = (updatedMistakes: MistakeWord[]) => {
    setMistakes(updatedMistakes);
    localStorage.setItem("lexiscan_mistakes", JSON.stringify(updatedMistakes));
  };

  // Text-To-Speech (Pronunciation)
  const speakWord = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.85; // Natural clear slow speed for learning dictation
      window.speechSynthesis.speak(utterance);
    } else {
      alert("您的浏览器暂不支持语音合成，建议在现代 Chrome/Edge/Safari 浏览器中使用。");
    }
  };

  // Callback when File/Photo uploaded & raw words extracted by server
  const handleWordsExtracted = (extractedWords: string[], sourceName: string) => {
    setExtractedDraft({
      words: Array.from(new Set(extractedWords.map(w => w.toLowerCase()))), // unique lowercase
      sourceName,
      customTitle: `提取自 - ${sourceName.replace(/^图片:\s*|^输入:\s*/, "")}`
    });
    // Scroll to draft preview
    setTimeout(() => {
      document.getElementById("draft-preview-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Remove a word from raw extracted draft
  const handleRemoveDraftWord = (word: string) => {
    if (!extractedDraft) return;
    setExtractedDraft({
      ...extractedDraft,
      words: extractedDraft.words.filter(w => w !== word)
    });
  };

  // Manually add words to current raw draft
  const [newDraftWordInput, setNewDraftWordInput] = useState("");
  const handleAddWordToDraft = () => {
    if (!extractedDraft || !newDraftWordInput.trim()) return;
    const clean = newDraftWordInput.trim().toLowerCase().replace(/[^a-zA-Z-]/g, "");
    if (clean && !extractedDraft.words.includes(clean)) {
      setExtractedDraft({
        ...extractedDraft,
        words: [...extractedDraft.words, clean]
      });
    }
    setNewDraftWordInput("");
  };

  // Call Gemini to generate full details (phonetic, translation, translation reference)
  const handleGenerateDetailsAndSave = async () => {
    if (!extractedDraft || extractedDraft.words.length === 0) return;
    setIsGeneratingDetails(true);
    setGenerationProgress(10);

    try {
      const response = await fetch("/api/dictation/generate-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: extractedDraft.words }),
      });

      setGenerationProgress(60);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "生成单词详情失败。");
      }

      setGenerationProgress(90);

      if (data.details && Array.isArray(data.details)) {
        // Map generated objects to official WordDetail
        const finalWords: WordDetail[] = data.details.map((item: any, idx: number) => ({
          id: `word-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          word: (item.word || "").toLowerCase().trim(),
          phonetic: item.phonetic || "/ - /",
          translation: item.translation || "n. 无释义",
          example: item.example || "No example sentence generated.",
          exampleTranslation: item.exampleTranslation || "暂无例句翻译。",
          addedAt: Date.now()
        }));

        // Create new List
        const newList: WordList = {
          id: `list-${Date.now()}`,
          title: extractedDraft.customTitle || "未命名单词本",
          description: `共 ${finalWords.length} 个单词，通过 AI 智能提取及释义完善`,
          words: finalWords,
          createdAt: Date.now()
        };

        const updatedLists = [newList, ...lists];
        saveListsToStorage(updatedLists);
        setSelectedListId(newList.id);
        setExtractedDraft(null); // Clear draft
        setActiveTab("library");

        // Flash message
        alert(`🎉 成功创建单词簿《${newList.title}》，已自动生成所有的精美音标、中文互译和原比例句！`);
      } else {
        throw new Error("模型未返回格式化结果。");
      }
    } catch (e: any) {
      console.error(e);
      alert(`AI 解析错误: ${e.message || "请求超时或网络拥堵，请重试。"}`);
    } finally {
      setIsGeneratingDetails(false);
      setGenerationProgress(0);
    }
  };

  // Add a single word manually via AI directly to the selected list
  const handleAddSingleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordSpelling.trim() || !selectedListId) return;

    setIsAddingSingleWord(true);
    const targetWord = newWordSpelling.trim().toLowerCase();

    try {
      const response = await fetch("/api/dictation/generate-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: [targetWord] }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "获取词义失败");

      if (data.details && data.details.length > 0) {
        const item = data.details[0];
        const newDetail: WordDetail = {
          id: `word-${Date.now()}`,
          word: item.word || targetWord,
          phonetic: item.phonetic || "/ - /",
          translation: item.translation || "无释义",
          example: item.example || "No example.",
          exampleTranslation: item.exampleTranslation || "暂无翻译",
          addedAt: Date.now()
        };

        const updatedLists = lists.map(lst => {
          if (lst.id === selectedListId) {
            // Check if already exist
            if (lst.words.some(w => w.word === newDetail.word)) {
              alert("单词在列表中已存在哦！");
              return lst;
            }
            return {
              ...lst,
              words: [newDetail, ...lst.words]
            };
          }
          return lst;
        });

        saveListsToStorage(updatedLists);
        setNewWordSpelling("");
        setShowAddWordModal(false);
      }
    } catch (error: any) {
      alert("智能扩充单词失败：" + error.message);
    } finally {
      setIsAddingSingleWord(false);
    }
  };

  // Delete a word list
  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这个单词本吗？此操作不可恢复。")) {
      const updated = lists.filter(lst => lst.id !== id);
      saveListsToStorage(updated);
      if (selectedListId === id) {
        setSelectedListId(updated[0]?.id || "");
      }
    }
  };

  // Delete individual word from a list
  const handleDeleteWordFromList = (listId: string, wordId: string) => {
    const updated = lists.map(lst => {
      if (lst.id === listId) {
        return {
          ...lst,
          words: lst.words.filter(w => w.id !== wordId)
        };
      }
      return lst;
    });
    saveListsToStorage(updated);
  };

  // Init Dictation Session
  const handleStartDictation = (listId: string | "all-words" | "mistakes") => {
    let sourceWords: WordDetail[] = [];

    if (listId === "all-words") {
      // Gather all distinct words across all lists
      const all: { [key: string]: WordDetail } = {};
      lists.forEach(l => l.words.forEach(w => { all[w.word] = w; }));
      sourceWords = Object.values(all);
    } else if (listId === "mistakes") {
      sourceWords = mistakes.filter(m => !m.mastered).map(m => m.detail);
    } else {
      const found = lists.find(l => l.id === listId);
      if (found) {
        sourceWords = [...found.words];
      }
    }

    if (sourceWords.length === 0) {
      alert("该分组内没有任何词汇可供默写。请先导入/导入词本！");
      return;
    }

    // Shuffle words sequence
    const shuffled = [...sourceWords].sort(() => Math.random() - 0.5);

    setSession({
      listId,
      shuffledWords: shuffled,
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      answers: [],
      isFinished: false
    });
    setDictationInput("");
    setShowAnswerFeedback(false);
    setFeedbackIsCorrect(false);
    setShowDefinitionHint(false);
    setMistakesThisSession([]);
    setActiveTab("dictation");

    // Micro-delay speech for the first word
    setTimeout(() => {
      if (shuffled[0]) {
        speakWord(shuffled[0].word);
      }
    }, 450);
  };

  const handleCheckSpelling = () => {
    if (!session || showAnswerFeedback) return;

    const currentWordDetail = session.shuffledWords[session.currentIndex];
    const target = currentWordDetail.word.trim().toLowerCase();
    const typed = dictationInput.trim().toLowerCase();

    const isCorrect = target === typed;

    setFeedbackIsCorrect(isCorrect);
    setShowAnswerFeedback(true);

    // Save answer logging
    const updatedAnswers = [
      ...session.answers,
      {
        wordId: currentWordDetail.id,
        userInput: dictationInput,
        isCorrect,
        timestamp: Date.now()
      }
    ];

    let correctInc = session.correctCount;
    let incorrectInc = session.incorrectCount;

    if (isCorrect) {
      correctInc += 1;
    } else {
      incorrectInc += 1;
      setMistakesThisSession(prev => [...prev, currentWordDetail]);

      // Record in global mistakes storage
      const existingIdx = mistakes.findIndex(m => m.word.toLowerCase() === target);
      if (existingIdx > -1) {
        const updatedMs = [...mistakes];
        updatedMs[existingIdx] = {
          ...updatedMs[existingIdx],
          wrongAttempts: updatedMs[existingIdx].wrongAttempts + 1,
          lastAttemptAt: Date.now(),
          mastered: false, // reset mastered if they failed it again
          detail: currentWordDetail // keep detail updated
        };
        saveMistakesToStorage(updatedMs);
      } else {
        const newMistake: MistakeWord = {
          word: currentWordDetail.word,
          detail: currentWordDetail,
          wrongAttempts: 1,
          lastAttemptAt: Date.now(),
          mastered: false
        };
        saveMistakesToStorage([newMistake, ...mistakes]);
      }
    }

    // Auto trigger pronunciation voice upon checking to reinforce memory
    speakWord(currentWordDetail.word);

    // Quick move config
    setSession({
      ...session,
      correctCount: correctInc,
      incorrectCount: incorrectInc,
      answers: updatedAnswers
    });
  };

  const handleNextWord = () => {
    if (!session) return;

    const nextIndex = session.currentIndex + 1;
    const isFinished = nextIndex >= session.shuffledWords.length;

    setSession({
      ...session,
      currentIndex: nextIndex,
      isFinished
    });

    setDictationInput("");
    setShowAnswerFeedback(false);
    setShowDefinitionHint(false);

    if (!isFinished) {
      setTimeout(() => {
        if (session.shuffledWords[nextIndex]) {
          speakWord(session.shuffledWords[nextIndex].word);
        }
      }, 200);
    }
  };

  // Clear or forgive a mistake word
  const handleMasterMistake = (word: string) => {
    const updated = mistakes.map(m => {
      if (m.word.toLowerCase() === word.toLowerCase()) {
        return { ...m, mastered: true };
      }
      return m;
    });
    saveMistakesToStorage(updated);
  };

  const handleForgetMistake = (word: string) => {
    const updated = mistakes.filter(m => m.word.toLowerCase() !== word.toLowerCase());
    saveMistakesToStorage(updated);
  };

  const activeWordsInList = selectedListId 
    ? (lists.find(l => l.id === selectedListId)?.words || [])
    : lists.flatMap(l => l.words);

  const filteredWords = activeWordsInList.filter(w => 
    w.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.translation.includes(searchQuery)
  );

  const currentActiveListTitle = selectedListId
    ? lists.find(l => l.id === selectedListId)?.title || "所有词册汇聚"
    : "所有词册汇聚";

  // Total mastered vs wrong calculations
  const totalDistinctStored = Array.from(new Set(lists.flatMap(l => l.words.map(w => w.word.toLowerCase())))).length;
  const activeUnmasteredMistakes = mistakes.filter(m => !m.mastered);

  // Dynamic sentence blanking helper for dictation prompt: e.g. "She loves apples" -> "She loves [______]"
  const getBlankedSentence = (sentence: string, targetWord: string) => {
    if (!sentence || !targetWord) return "";
    // Robust case-insensitive replace of the word in sentence
    const regex = new RegExp(`\\b${targetWord}\\b`, "gi");
    let replaced = sentence.replace(regex, `______`);
    
    // Fallback if targetWord has varying base forms or punctuation attachment
    if (replaced === sentence) {
      // split target word by syllables or sub-suffixes
      const rootPart = targetWord.substring(0, Math.max(3, targetWord.length - 3));
      const partialRegex = new RegExp(`\\b${rootPart}[a-z]*\\b`, "gi");
      replaced = sentence.replace(partialRegex, `______`);
    }
    return replaced;
  };

  return (
    <div id="lexi-app-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-950">
      
      {/* 1. TOP HEADER */}
      <header id="app-header" className="sticky top-0 z-40 bg-white border-b border-indigo-100/60 px-6 lg:px-12 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
            <span className="text-white font-extrabold text-xl leading-none">L</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">LexiDict AI</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">智能英文听写系统</p>
          </div>
        </div>

        {/* Global tab Switch buttons */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            id="tab-library"
            onClick={() => { setActiveTab("library"); setSession(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "library"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            单词本库
          </button>
          
          <button
            id="tab-dictation"
            onClick={() => setActiveTab("dictation")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "dictation"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 animate-spin-slow" />
            开始听写默写
          </button>

          <button
            id="tab-mistakes"
            onClick={() => { setActiveTab("mistakes"); setSession(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 relative ${
              activeTab === "mistakes"
                ? "bg-white text-rose-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-rose-500" />
            错词本
            {activeUnmasteredMistakes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {activeUnmasteredMistakes.length}
              </span>
            )}
          </button>
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right leading-tight">
            <span className="text-xs text-slate-400 font-semibold block uppercase tracking-widest">
              词库总计
            </span>
            <span className="text-sm font-bold text-slate-800">
              {totalDistinctStored} 英文词
            </span>
          </div>
          <div className="h-8 w-[1px] bg-indigo-50"></div>
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100">
            错词: {activeUnmasteredMistakes.length}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main id="app-main-body" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">
        
        {/* ======================= SIDEBAR (LEFT 3 COLS) ======================= */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* STATS CARD */}
          <div className="bg-white rounded-2xl p-5 border border-indigo-100/60 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">听写成就仪表盘</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">已录入单词</span>
                <span className="text-xl font-bold text-slate-800">{totalDistinctStored}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">遗留错词</span>
                <span className="text-xl font-bold text-rose-600">
                  {activeUnmasteredMistakes.length}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>错词本消灭率</span>
                <span className="font-bold text-indigo-600">
                  {mistakes.length > 0 
                    ? Math.round((mistakes.filter(m => m.mastered).length / mistakes.length) * 100) 
                    : 100}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500"
                  style={{ 
                    width: `${mistakes.length > 0 
                      ? (mistakes.filter(m => m.mastered).length / mistakes.length) * 100 
                      : 100}%` 
                  }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => handleStartDictation("all-words")}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              随堂全能盲听默写
            </button>
          </div>

          {/* MY LISTS SUMMARY SELECTOR */}
          <div className="bg-white rounded-2xl border border-indigo-100/60 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">我的词书馆 ({lists.length})</h3>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {/* "All Words" general indicator */}
              <div
                onClick={() => {
                  setSelectedListId("");
                  setActiveTab("library");
                }}
                className={`p-3 rounded-xl cursor-pointer border transition-all text-left ${
                  selectedListId === ""
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-100 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">📚 所有词册合集</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                    {totalDistinctStored}
                  </span>
                </div>
                <p className="text-[10px] opacity-60 mt-1">全局聚合查阅与交叉默写</p>
              </div>

              {lists.map((lst) => (
                <div
                  key={lst.id}
                  onClick={() => {
                    setSelectedListId(lst.id);
                    setActiveTab("library");
                  }}
                  className={`p-3 rounded-xl cursor-pointer border transition-all text-left relative group ${
                    selectedListId === lst.id
                      ? "bg-indigo-50 border-indigo-200 text-indigo-950"
                      : "bg-white hover:bg-slate-50 border-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold block truncate max-w-[130px]" title={lst.title}>
                      {lst.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {lst.words.length} 词
                      </span>
                      {/* Delete icon - prevent trigger default */}
                      <button
                        onClick={(e) => handleDeleteList(lst.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 transition-all"
                        title="删除此词书"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{lst.description || "暂无备注"}</p>
                </div>
              ))}

              {lists.length === 0 && (
                <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl text-center text-xs text-slate-400">
                  暂无自定义词册
                </div>
              )}
            </div>
          </div>

          {/* INTUITION ADVERTISEMENT BANNER */}
          {activeTab !== "dictation" && (
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                <Sparkles className="w-32 h-32 text-white stroke-[1]" />
              </div>
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 backdrop-blur-sm text-[9px] rounded-full uppercase tracking-wider font-extrabold text-indigo-200">
                  <Sparkles className="h-3 w-3" />
                  Gemini OCR Powered
                </div>
                <h4 className="text-sm font-bold">书本单词一拍即得</h4>
                <p className="text-xs leading-relaxed text-indigo-200">
                  将试卷、背词卡、教材拍照，或导入 TXT 文件。模型会自动捕获纯英单词，一键即可配对原版音标、行业级别释义与英汉双语例句。
                </p>
                <a
                  href="#file-uploader"
                  onClick={() => { setActiveTab("library"); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors px-3 py-1.5 rounded-lg"
                >
                  去拍照提取
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}

        </div>

        {/* ======================= MAIN CONTENT TABS (RIGHT 9 COLS) ======================= */}
        <div className="lg:col-span-9 space-y-6">

          {/* A. VIEW 1: LIBRARY MANAGER */}
          {activeTab === "library" && !session && (
            <div id="library-tab-panel" className="space-y-6">
              
              {/* INSTRUCTION TIPS */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-100/60 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-800">
                    导入与建立词册库
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    拍照上传教材图片，或导入词单文本文件。LexiDict 会调取 Gemini 大语言模型，将每一个提取出来的原生单词，自动配齐精美英音/美音音标、恰当词性汉译，和场景高度贴合的实用中英双语例句。
                  </p>
                </div>

                {/* Import File Component Zone */}
                <FileUploadZone onWordsExtracted={handleWordsExtracted} />
              </div>

              {/* STAGING PANEL FOR AI GENERATION */}
              {extractedDraft && (
                <div id="draft-preview-section" className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6 space-y-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                          AI 临时暂存区
                        </span>
                        <h3 className="text-base font-bold text-slate-800">待生成详情的英文单词</h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        以下是成功从 <strong>{extractedDraft.sourceName}</strong> 中解析出的词汇。你可以删除误识别短词、或者加上您想新学的基础词。
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateDetailsAndSave}
                      disabled={isGeneratingDetails || extractedDraft.words.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all shrink-0"
                    >
                      {isGeneratingDetails ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          AI 释义与例句生成中 {generationProgress}%
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          开始 AI 一键精美排版 ({extractedDraft.words.length} 词)
                        </>
                      )}
                    </button>
                  </div>

                  {isGeneratingDetails && (
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold italic">
                        提示: 正在使用 AI 模型为每个单词查找原版 IPA 音标、适配语境的最佳释义并搭配例句...
                      </span>
                    </div>
                  )}

                  {/* Manual fast insert while in draft */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDraftWordInput}
                      onChange={(e) => setNewDraftWordInput(e.target.value)}
                      placeholder="往这个词单里手动添补一个英文词..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddWordToDraft()}
                      className="w-full max-w-sm px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none"
                    />
                    <button
                      onClick={handleAddWordToDraft}
                      className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-950 text-xs font-semibold rounded-lg shrink-0"
                    >
                      添入
                    </button>
                  </div>

                  {/* Badges of Raw words */}
                  <div className="bg-white/80 border border-slate-200/50 p-4 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">已提炼单词：</span>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {extractedDraft.words.map((w) => (
                        <span
                          key={w}
                          className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 group transition-all"
                        >
                          {w}
                          <button
                            onClick={() => handleRemoveDraftWord(w)}
                            className="text-slate-400 group-hover:text-rose-500 font-bold transition-colors ml-0.5"
                            title="删除此词"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}

                      {extractedDraft.words.length === 0 && (
                        <span className="text-xs text-rose-500">
                          暂存列表空空如也，请在上方输入添加！
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Book custom input title */}
                  <div className="bg-white/50 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <label className="text-xs font-bold text-slate-600 shrink-0">自定义此词本名称：</label>
                    <input
                      type="text"
                      value={extractedDraft.customTitle}
                      onChange={(e) => setExtractedDraft({ ...extractedDraft, customTitle: e.target.value })}
                      placeholder="给新生成的单词册取个名字"
                      className="flex-1 w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* VOCABULARY BROWSING GRID */}
              <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
                
                {/* Search and Action header */}
                <div className="p-5 border-b border-indigo-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800">
                      单词库详情浏览 — <span className="text-indigo-600 font-extrabold">{currentActiveListTitle}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      共包含 {filteredWords.length} 个单词详情。支持点击发音及进行单元听写默写。
                    </p>
                  </div>

                  {/* Tools */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="检索检索单词或意思..."
                        className="pl-8.5 pr-4 py-2 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full md:w-48 bg-slate-50/50"
                      />
                    </div>
                    
                    {selectedListId && (
                      <button
                        onClick={() => setShowAddWordModal(true)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        添加单词
                      </button>
                    )}

                    <button
                      onClick={() => handleStartDictation(selectedListId || "all-words")}
                      disabled={filteredWords.length === 0}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      听写此单元
                    </button>
                  </div>
                </div>

                {/* Main Words Grid list */}
                <div className="divide-y divide-slate-100">
                  {filteredWords.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      {/* Left: word spelling, phonetics and translations */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-300 font-mono text-xs font-bold">
                            {(index + 1).toString().padStart(2, "0")}
                          </span>
                          <h4 className="text-lg font-bold tracking-tight text-slate-800 select-all hover:text-indigo-600 transition-colors">
                            {item.word}
                          </h4>
                          <span className="text-indigo-600 font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                            {item.phonetic}
                          </span>
                          <button
                            onClick={(e) => speakWord(item.word, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0"
                            title="原声朗读"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        
                        <p className="text-sm font-semibold text-slate-700">
                          {item.translation}
                        </p>

                        <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-xl max-w-2xl text-xs space-y-1">
                          <span className="font-semibold text-indigo-500 uppercase tracking-widest text-[9px] block">
                            学习应用例句
                          </span>
                          <p className="italic text-slate-700 leading-relaxed">
                            {item.example}
                          </p>
                          <p className="text-slate-400 leading-relaxed font-sans mt-0.5">
                            {item.exampleTranslation}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quick actions for individual words */}
                      <button
                        onClick={() => handleDeleteWordFromList(selectedListId || lists[0]?.id, item.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-all shrink-0 self-end md:self-center"
                        title="从该册子删除单词"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {filteredWords.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <BookmarkCheck className="h-12 w-12 text-slate-300 mx-auto stroke-[1.2] mb-3" />
                      <p className="text-sm font-semibold text-slate-700">当前词本当中没有符合检索的词汇</p>
                      <p className="text-xs text-slate-400 mt-1">您可以通过上方拖拽图片或纯手工添加一些词汇！</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ADD INDIVIDUAL WORD MODAL */}
          {showAddWordModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200/80 shadow-2xl space-y-5 animate-scale-up">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800">扩充当前词本</h3>
                  <button 
                    onClick={() => setShowAddWordModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-500">
                  只需输入待加英文词，AI 会为您自动配全释义、音标与例句书。
                </p>

                <form onSubmit={handleAddSingleWordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">追加英文单词</label>
                    <input
                      type="text"
                      required
                      value={newWordSpelling}
                      onChange={(e) => setNewWordSpelling(e.target.value)}
                      placeholder="比如: meticulous"
                      className="w-full text-base font-medium px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWordModal(false)}
                      className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSingleWord || !newWordSpelling.trim()}
                      className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isAddingSingleWord ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          正在生成释义例句...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          添加到词本
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* B. VIEW 2: DICTATION CAROUSEL SESSION */}
          {activeTab === "dictation" && (
            <div id="dictation-tab-panel" className="space-y-6">
              
              {/* NO SESSION CURRENT_SETUP */}
              {!session && (
                <div className="bg-white rounded-3xl p-8 border border-indigo-100/60 shadow-sm text-center max-w-xl mx-auto space-y-6">
                  <div className="space-y-2">
                    <div className="mx-auto w-16 h-16 bg-slate-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Trophy className="h-8 w-8 stroke-[1.5]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">开始您的英文默写听写</h2>
                    <p className="text-xs text-slate-400">
                      系统将像专业的私教老师一样，朗读英文并提供音标及句式空白，帮助您检验每个单词的精确拼写！
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-slate-500 text-left">
                      请选择要听写的词源范围：
                    </label>

                    <div className="space-y-2 text-left">
                      {/* Standard All Option */}
                      <div
                        onClick={() => handleStartDictation("all-words")}
                        className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-800 block">📚 混合全部熟词默写</span>
                          <span className="text-xs text-slate-400">汇聚当前系统里所有录入的单词进行随机组播</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>

                      {/* Mistakes Options */}
                      <div
                        onClick={() => handleStartDictation("mistakes")}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                          activeUnmasteredMistakes.length > 0
                            ? "bg-rose-50/50 hover:bg-rose-50 border-rose-100"
                            : "bg-slate-50 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-rose-800 block">🔥 单独听写未掌握“错词”</span>
                          <span className="text-xs text-rose-600">
                            仅针对当前错词本中的 {activeUnmasteredMistakes.length} 个单词进行攻坚纠错
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full shrink-0">
                          {activeUnmasteredMistakes.length}
                        </span>
                      </div>

                      {/* Individual list options */}
                      {lists.map(lst => (
                        <div
                          key={lst.id}
                          onClick={() => handleStartDictation(lst.id)}
                          className="p-4 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <span className="text-sm font-semibold text-slate-800 block">📖 {lst.title}</span>
                            <span className="text-xs text-slate-400">仅背诵它里面的 {lst.words.length} 个单词</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVE SESSION PANEL */}
              {session && !session.isFinished && (
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-indigo-100/60 shadow-sm flex flex-col items-center justify-center relative min-h-[460px] animate-scale-up">
                  
                  {/* Absolute Progress indicator */}
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                      进度 STEP {session.currentIndex + 1} / {session.shuffledWords.length}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">
                      正确: {session.correctCount}
                    </span>
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold">
                      错误: {session.incorrectCount}
                    </span>
                  </div>

                  {/* Absolute End Session trigger */}
                  <button
                    onClick={() => {
                      if (confirm("确实要终止当前这盘拼写默写吗？进度不会被单独归档。")) {
                        setSession(null);
                      }
                    }}
                    className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 p-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold"
                  >
                    放弃拼写
                  </button>

                  {/* Active word play space */}
                  <div className="text-center space-y-6 max-w-2xl w-full mt-6">
                    
                    {/* Audio & Phonetic Banner */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Interactive sound player */}
                        <button
                          onClick={() => speakWord(session.shuffledWords[session.currentIndex].word)}
                          className="w-14 h-14 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all group"
                          title="点击发音"
                        >
                          <Volume2 className="h-7 w-7 animate-pulse" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-indigo-600 font-mono text-lg font-bold block select-none">
                          {session.shuffledWords[session.currentIndex].phonetic}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          请听老师朗读，并在下方输入正确的拼写。
                        </p>
                      </div>
                    </div>

                    {/* Word Character placeholders */}
                    <div className="py-2">
                      <div className="flex justify-center gap-1.5 flex-wrap">
                        {session.shuffledWords[session.currentIndex].word.split("").map((char, cidx) => {
                          // If feedback is showing, we can hint correct characters
                          const isSpace = char === " ";
                          const isHyphen = char === "-";
                          
                          if (isSpace) {
                            return <div key={cidx} className="w-4" />;
                          }
                          if (isHyphen) {
                            return <div key={cidx} className="text-slate-400 font-bold">-</div>;
                          }

                          return (
                            <div 
                              key={cidx} 
                              className={`w-7 h-9 border-b-2 flex items-end justify-center pb-1 text-lg font-bold transition-all ${
                                showAnswerFeedback
                                  ? feedbackIsCorrect 
                                    ? "border-emerald-500 text-emerald-600" 
                                    : "border-rose-400 text-rose-500"
                                  : "border-slate-200 text-slate-800"
                              }`}
                            >
                              {showAnswerFeedback 
                                ? session.shuffledWords[session.currentIndex].word[cidx] 
                                : dictationInput[cidx] || ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Input interaction space */}
                    <div className="space-y-4 max-w-md mx-auto">
                      {!showAnswerFeedback ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={dictationInput}
                            onChange={(e) => setDictationInput(e.target.value.replace(/[^a-zA-Z-\s]/g, ""))}
                            placeholder="请精准键入单词..."
                            onKeyDown={(e) => e.key === "Enter" && handleCheckSpelling()}
                            autoFocus
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            className="flex-1 text-center text-xl font-bold outline-none text-slate-800 placeholder:text-slate-300 py-3 border-b-2 border-slate-200 focus:border-indigo-600 transition-all uppercase tracking-widest"
                          />
                          <button
                            onClick={handleCheckSpelling}
                            disabled={!dictationInput.trim()}
                            className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shrink-0"
                          >
                            核对
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl flex flex-col items-center justify-center space-y-3 bg-slate-50 animate-fade-in border border-slate-200/50">
                          <div className="flex items-center gap-2">
                            {feedbackIsCorrect ? (
                              <span className="flex items-center gap-1 text-emerald-600 text-sm font-extrabold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                <CheckCircle className="h-4 w-4" />
                                完全正确！
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-600 text-sm font-extrabold bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                                <XCircle className="h-4 w-4" />
                                拼写有误
                              </span>
                            )}
                          </div>

                          <div className="text-center">
                            <p className="text-xs text-slate-400">正确拼写：</p>
                            <p className="text-2xl font-black tracking-wider text-slate-800 select-all">
                              {session.shuffledWords[session.currentIndex].word}
                            </p>
                            {!feedbackIsCorrect && dictationInput && (
                              <p className="text-xs text-slate-400 mt-1">
                                您的输入：<span className="line-through text-rose-500 font-mono font-bold uppercase">{dictationInput}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Example & Translations Prompt Panel */}
                    <div className="space-y-3">
                      
                      {/* Context sentence box */}
                      <div className="bg-slate-50 p-5 rounded-2xl text-left border border-slate-100 leading-relaxed shadow-inner">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">提示：上下文原比例句</span>
                        
                        {/* Target word is dynamic slate blanked */}
                        <p className="italic text-slate-700 text-sm">
                          "{getBlankedSentence(
                            session.shuffledWords[session.currentIndex].example,
                            session.shuffledWords[session.currentIndex].word
                          )}"
                        </p>

                        <p className="text-xs text-slate-400 font-sans mt-1.5">
                          {session.shuffledWords[session.currentIndex].exampleTranslation}
                        </p>
                      </div>

                      {/* Display toggle trigger for Translation meaning hint */}
                      <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500">查看中文义项</span>
                        
                        <button
                          type="button"
                          onClick={() => setShowDefinitionHint(!showDefinitionHint)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-600 rounded-lg text-xs font-semibold shadow-xs hover:bg-slate-100 transition-colors"
                        >
                          {showDefinitionHint ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showDefinitionHint ? "隐藏释义" : "显示释义"}
                        </button>
                      </div>

                      {showDefinitionHint && (
                        <p className="p-3 bg-indigo-50/40 text-indigo-950 font-semibold text-xs text-left rounded-xl border border-indigo-150 animate-fade-in">
                          释义提示：{session.shuffledWords[session.currentIndex].translation}
                        </p>
                      )}

                    </div>

                    {/* Bottom controls panel */}
                    <div className="pt-4 flex justify-center gap-3">
                      {!showAnswerFeedback ? (
                        <button
                          onClick={() => {
                            setDictationInput(session.shuffledWords[session.currentIndex].word);
                            handleCheckSpelling();
                          }}
                          className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
                        >
                          不记得了
                        </button>
                      ) : (
                        <button
                          onClick={handleNextWord}
                          className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-150"
                        >
                          继续下一个
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* PRACTICE END SESSION scorecard */}
              {session && session.isFinished && (
                <div className="bg-white rounded-3xl p-8 border border-indigo-100/60 shadow-sm text-center max-w-xl mx-auto space-y-6 animate-scale-up">
                  
                  <div className="space-y-2">
                    <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Award className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">🎉 本组默写已顺利结课！</h2>
                    <p className="text-xs text-slate-400">
                      回顾和整理是打破阻碍、牢固记忆的极佳法宝！
                    </p>
                  </div>

                  {/* SCORE RADAR PROGRESS */}
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">听写拼对正确率</span>
                      <span className="text-2xl font-black text-indigo-650">
                        {Math.round((session.correctCount / session.shuffledWords.length) * 100)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          (session.correctCount / session.shuffledWords.length) > 0.7 
                            ? "bg-emerald-500" 
                            : "bg-indigo-600"
                        }`}
                        style={{ width: `${(session.correctCount / session.shuffledWords.length) * 100}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">总词数</span>
                        <span className="text-sm font-bold text-slate-800">{session.shuffledWords.length}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium text-emerald-600">完成对词</span>
                        <span className="text-sm font-bold text-emerald-600">{session.correctCount}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium text-rose-500">拼错扣减</span>
                        <span className="text-sm font-bold text-rose-500">{session.incorrectCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* MISPELLED LIST REVIEW TAB */}
                  {mistakesThisSession.length > 0 && (
                    <div className="space-y-2 text-left">
                      <span className="text-xs font-bold text-rose-900 block">
                        本次拼错的单词 ({mistakesThisSession.length})，已自动收编错词本：
                      </span>
                      <div className="divide-y divide-slate-100 bg-rose-50/20 border border-rose-100 rounded-2xl max-h-48 overflow-y-auto p-2">
                        {mistakesThisSession.map((w) => (
                          <div key={w.id} className="py-2.5 px-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{w.word}</span>
                              <span className="text-slate-400 font-mono">{w.phonetic}</span>
                            </div>
                            <span className="text-slate-500 truncate max-w-[200px]" title={w.translation}>
                              {w.translation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BUTTON ACTIONS */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSession(null)}
                      className="flex-1 py-3 bg-slate-900 text-white font-bold text-xs rounded-2xl hover:bg-slate-950 transition-colors shadow-lg"
                    >
                      完成并返回主页
                    </button>
                    
                    {mistakesThisSession.length > 0 && (
                      <button
                        onClick={() => {
                          const shuffled = [...mistakesThisSession].sort(() => Math.random() - 0.5);
                          setSession({
                            listId: "mistakes",
                            shuffledWords: shuffled,
                            currentIndex: 0,
                            correctCount: 0,
                            incorrectCount: 0,
                            answers: [],
                            isFinished: false
                          });
                          setDictationInput("");
                          setShowAnswerFeedback(false);
                          setShowDefinitionHint(false);
                          setMistakesThisSession([]);
                          setTimeout(() => {
                            speakWord(shuffled[0].word);
                          }, 300);
                        }}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl transition-colors shadow-lg shadow-rose-100"
                      >
                        仅重跑本次错词
                      </button>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}


          {/* C. VIEW 3: MISTAKES LIST REVIEW */}
          {activeTab === "mistakes" && (
            <div id="mistakes-tab-panel" className="space-y-6">
              
              {/* INTRO AND FLASHCARD CONTROLLER */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-100/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-850">
                    错词本攻攻坚房 ({activeUnmasteredMistakes.length})
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    凡是您在拼写默写中拼错、或标记不熟的词。都会记录至此，并按照<strong>拼错频分布</strong>进行跟踪。建议使用下方翻卡模式巩固记忆，直到完全掌握为止。
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleStartDictation("mistakes")}
                    disabled={activeUnmasteredMistakes.length === 0}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 inline-flex"
                  >
                    <RotateCcw className="h-3.5 w-3.5 animate-pulse" />
                    错词盲打听写模式
                  </button>
                </div>
              </div>

              {/* IMMERSIVE FLASHCARD DECK (ONLY IF HAS WRONG WORDS) */}
              {activeUnmasteredMistakes.length > 0 ? (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    错词复习卡片（第 {flashcardIndex + 1} / {activeUnmasteredMistakes.length} 个）
                  </span>

                  <div 
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    className="relative bg-white cursor-pointer hover:shadow-md transition-all duration-300 border-2 border-dashed border-indigo-150 rounded-3xl min-h-[220px] p-6 flex flex-col items-center justify-center text-center gap-4"
                  >
                    {!flashcardFlipped ? (
                      /* FRONT SIDE */
                      <div className="space-y-4 animate-fade-in w-full">
                        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                          <Volume2 className="h-6 w-6" onClick={(e) => speakWord(activeUnmasteredMistakes[flashcardIndex].word, e)} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-indigo-600 font-mono text-base font-bold">
                            {activeUnmasteredMistakes[flashcardIndex].detail.phonetic}
                          </span>
                          <p className="text-xs text-slate-400">
                            提示：点击听发音 / 点击卡片翻面看词义
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 mx-auto max-w-lg rounded-xl border border-slate-100">
                          <p className="italic text-slate-600 text-sm">
                            "{getBlankedSentence(
                              activeUnmasteredMistakes[flashcardIndex].detail.example,
                              activeUnmasteredMistakes[flashcardIndex].word
                            )}"
                          </p>
                        </div>
                        
                        <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full inline-block">
                          拼错 {activeUnmasteredMistakes[flashcardIndex].wrongAttempts} 次
                        </span>
                      </div>
                    ) : (
                      /* BACK SIDE */
                      <div className="space-y-4 animate-fade-in w-full">
                        <div className="space-y-2">
                          <h3 className="text-3xl font-black text-indigo-900 tracking-tight">
                            {activeUnmasteredMistakes[flashcardIndex].word}
                          </h3>
                          <span className="text-indigo-600 font-mono text-sm bg-indigo-50 px-2.5 py-0.5 rounded-full font-bold">
                            {activeUnmasteredMistakes[flashcardIndex].detail.phonetic}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-base">
                            {activeUnmasteredMistakes[flashcardIndex].detail.translation}
                          </p>
                          <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                            例句完整原文: {activeUnmasteredMistakes[flashcardIndex].detail.example}
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMasterMistake(activeUnmasteredMistakes[flashcardIndex].word);
                              // Auto slide to next or loop backward
                              if (flashcardIndex >= activeUnmasteredMistakes.length - 1) {
                                setFlashcardIndex(0);
                              }
                              setFlashcardFlipped(false);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            我已掌握
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow control decks */}
                  <div className="flex gap-2 justify-center max-w-xs mx-auto">
                    <button
                      onClick={() => {
                        setFlashcardFlipped(false);
                        setFlashcardIndex(prev => prev > 0 ? prev - 1 : activeUnmasteredMistakes.length - 1);
                      }}
                      className="flex-1 py-1 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                    >
                      上一个
                    </button>
                    <button
                      onClick={() => {
                        setFlashcardFlipped(false);
                        setFlashcardIndex(prev => prev < activeUnmasteredMistakes.length - 1 ? prev + 1 : 0);
                      }}
                      className="flex-1 py-1 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                    >
                      下一个
                    </button>
                  </div>
                </div>
              ) : null}

              {/* HISTORIC LIST REPORT VIEW */}
              <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-rose-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-rose-950">全部错词收纳报表</h3>
                    <p className="text-xs text-rose-600">按拼错频次及最近未背频率综合排版</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-150">
                  {mistakes.map((m) => (
                    <div
                      key={m.word}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        m.mastered ? "bg-slate-50 opacity-60" : "hover:bg-rose-50/10"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-md font-bold ${m.mastered ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {m.word}
                          </h4>
                          <span className="text-slate-400 font-mono text-xs">
                            {m.detail.phonetic}
                          </span>
                          
                          {m.mastered ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              已掌握
                            </span>
                          ) : (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                              错误 {m.wrongAttempts} 次
                            </span>
                          )}

                          <button
                            onClick={() => speakWord(m.word)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          >
                            <Volume2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600">{m.detail.translation}</p>
                        
                        <p className="text-[10px] text-slate-400">
                          最近听写错误时间: {new Date(m.lastAttemptAt).toLocaleString("zh-CN")}
                        </p>
                      </div>

                      <div className="flex gap-2 items-center self-end sm:self-center">
                        {!m.mastered ? (
                          <button
                            onClick={() => handleMasterMistake(m.word)}
                            className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            标记掌握并移出
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const updated = mistakes.map(item => {
                                if (item.word.toLowerCase() === m.word.toLowerCase()) {
                                  return { ...item, mastered: false };
                                }
                                return item;
                              });
                              saveMistakesToStorage(updated);
                            }}
                            className="text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                          >
                            不小心点错
                          </button>
                        )}

                        <button
                          onClick={() => handleForgetMistake(m.word)}
                          className="p-1.5 text-slate-300 hover:text-slate-600 transition-all hover:bg-slate-100 rounded-lg"
                          title="从错词本彻底剔除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {mistakes.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <BookmarkCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">没有错词记录哦！</p>
                      <p className="text-xs text-slate-400 mt-0.5">请加油保持完美的默写成功率！</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER STATS INFO */}
      <footer className="mt-auto py-5 border-t border-indigo-150/50 bg-white text-center text-[11px] text-slate-400">
        <div>
          LexiDict AI  &copy; {new Date().getFullYear()} — 全栈英语单词默写平台 / 本地离线学习数据与 Gemini 云大模型智汇引擎
        </div>
      </footer>
    </div>
  );
}
