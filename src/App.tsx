import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  BookOpen, 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  ChevronRight, 
  Play,
  Settings,
  History,
  GraduationCap,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from './lib/utils';
import { INITIAL_QUESTIONS, CHAPTERS } from './data';
import { Question, QuizMode, QuizState, HighScore, Progress } from './types';

const SparkleEffect = ({ type }: { type: 'sprinkle' | 'correct' | 'incorrect' }) => {
  const particleCount = type === 'sprinkle' ? 40 : 20;
  const particles = Array.from({ length: particleCount });
  
  const getColors = () => {
    if (type === 'correct') return ['#22c55e', '#FFD700', '#C0C0C0']; // Green, Gold, Silver
    if (type === 'incorrect') return ['#ef4444', '#B87333', '#B5A642']; // Red, Copper, Brass
    return ['#FFD700', '#C0C0C0', '#FFEC8B', '#E8E8E8']; // Gold, Silver for sprinkle
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((_, i) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        if (type === 'sprinkle') {
          // Path: Middle Right (100, 50) to Middle Upper Left (0, 25)
          const progress = i / particleCount;
          const startX = 100 - (progress * 100);
          const startY = 50 - (progress * 25);
          const delay = progress * 0.8;
          
          return (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0,
                left: `${startX}%`,
                top: `${startY}%`
              }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0, Math.random() * 1 + 0.5, 0.5, 0],
                top: [`${startY}%`, `${startY + 20 + Math.random() * 30}%`],
                left: [`${startX}%`, `${startX + (Math.random() - 0.5) * 10}%`],
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 2,
                ease: "easeOut",
                delay: delay
              }}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`
              }}
            />
          );
        } else {
          // Burst effect for correct/incorrect
          return (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0,
                left: '50%',
                top: '50%'
              }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, Math.random() * 2 + 1, 0],
                left: ['50%', `${50 + (Math.random() - 0.5) * 60}%`],
                top: ['50%', `${50 + (Math.random() - 0.5) * 60}%`],
                rotate: Math.random() * 720
              }}
              transition={{ 
                duration: 1.2,
                ease: "backOut",
                delay: Math.random() * 0.1
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 12px ${color}`
              }}
            />
          );
        }
      })}
    </div>
  );
};

export default function App() {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(CHAPTERS[0].id);
  const [state, setState] = useState<QuizState | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [progress, setProgress] = useState<Progress>({
    contextualUnlocked: false,
    conceptualUnlocked: false
  });
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showSparkles, setShowSparkles] = useState<'sprinkle' | 'correct' | 'incorrect' | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sparkleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'success' | 'error' | 'transition') => {
    initAudio();
    const ctx = audioContextRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'transition') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  };
  
  useEffect(() => {
    const savedScores = localStorage.getItem('social-studies-quiz-scores');
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }

    const savedProgress = localStorage.getItem('social-studies-quiz-progress');
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, []);

  const saveScore = (score: number, total: number, mode: QuizMode) => {
    const percentage = (score / total) * 100;
    const newScore: HighScore = {
      date: new Date().toLocaleDateString(),
      score,
      total,
      mode
    };
    const updatedScores = [newScore, ...highScores].slice(0, 10);
    setHighScores(updatedScores);
    localStorage.setItem('social-studies-quiz-scores', JSON.stringify(updatedScores));

    // Update progress
    if (percentage >= 70) {
      let updatedProgress = { ...progress };
      if (mode === 'definition') {
        updatedProgress.contextualUnlocked = true;
      } else if (mode === 'contextual') {
        updatedProgress.conceptualUnlocked = true;
      }
      setProgress(updatedProgress);
      localStorage.setItem('social-studies-quiz-progress', JSON.stringify(updatedProgress));
    }
  };

  const startQuiz = (selectedMode: QuizMode) => {
    setMode(selectedMode);
    
    // Use questions from selected chapter
    const currentChapter = CHAPTERS.find(c => c.id === selectedChapterId);
    const baseQuestions = currentChapter ? currentChapter.questions : INITIAL_QUESTIONS;
    
    let shuffled: Question[] = [];
    let pickedAlts: number[] = [];

    if (selectedMode === 'conceptual') {
      // For conceptual, use ALL words in the chapter
      shuffled = [...baseQuestions];
      // Pick randomly between alternative 1 and 2 (definition parts)
      pickedAlts = shuffled.map(q => {
        if (!q.alternatives || q.alternatives.length < 2) return -1;
        // Randomly pick index 1 or 2 if available, else 1
        return q.alternatives.length > 2 ? Math.floor(Math.random() * 2) + 1 : 1;
      });
    } else if (selectedMode === 'contextual') {
      // For contextual, pick 10 random words and use alternative 0 (example)
      shuffled = [...baseQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
      pickedAlts = shuffled.map(() => 0);
    } else {
      // For spelling and definition, pick 10 random words
      shuffled = [...baseQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
      pickedAlts = shuffled.map(() => -1);
    }

    setState({
      questions: shuffled,
      currentIndex: 0,
      score: 0,
      answers: [],
      isFinished: false,
      mode: selectedMode,
      pickedAlternatives: pickedAlts
    });
    setUserInput('');
    setFeedback(null);
  };

  const playWord = (word: string) => {
    if (!('speechSynthesis' in window)) {
      console.error("Speech synthesis not supported");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // Slightly slower for better clarity in spelling
    utterance.pitch = 1.0;

    setIsLoadingAudio(true);

    utterance.onend = () => {
      setIsLoadingAudio(false);
    };

    utterance.onerror = (event) => {
      console.error("SpeechSynthesis error", event);
      setIsLoadingAudio(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const currentQuestion = state ? state.questions[state.currentIndex] : null;

  const handleSubmit = () => {
    if (!state || !currentQuestion || feedback) return;

    const pickedAltIndex = state.pickedAlternatives[state.currentIndex];
    let isCorrect = false;
    let correctAnswer = currentQuestion.word;

    if (pickedAltIndex !== -1) {
      const alt = currentQuestion.alternatives![pickedAltIndex];
      isCorrect = userInput.trim().toLowerCase() === alt.answer.toLowerCase();
      correctAnswer = alt.answer;
    } else {
      isCorrect = userInput.trim().toLowerCase() === currentQuestion.word.toLowerCase();
    }

    const message = isCorrect 
      ? "Great job! That's correct." 
      : `Not quite. The correct answer is "${correctAnswer}".`;

    setFeedback({ isCorrect, message });
    
    if (isCorrect) {
      setState(prev => prev ? { ...prev, score: prev.score + 1 } : null);
      setShowSparkles('correct');
      playSound('success');
      if (sparkleTimeoutRef.current) clearTimeout(sparkleTimeoutRef.current);
      sparkleTimeoutRef.current = setTimeout(() => setShowSparkles(null), 1500);
    } else {
      setShowSparkles('incorrect');
      playSound('error');
      if (sparkleTimeoutRef.current) clearTimeout(sparkleTimeoutRef.current);
      sparkleTimeoutRef.current = setTimeout(() => setShowSparkles(null), 1500);
    }

    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        answers: [...prev.answers, { questionId: currentQuestion.id, answer: userInput, isCorrect }]
      };
    });
  };

  const nextQuestion = () => {
    if (!state) return;

    playSound('transition');
    setShowSparkles('sprinkle');
    if (sparkleTimeoutRef.current) clearTimeout(sparkleTimeoutRef.current);
    sparkleTimeoutRef.current = setTimeout(() => setShowSparkles(null), 2000);

    if (state.currentIndex + 1 >= state.questions.length) {
      setState(prev => prev ? { ...prev, isFinished: true } : null);
      saveScore(state.score, state.questions.length, state.mode);
    } else {
      setState(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null);
      setUserInput('');
      setFeedback(null);
    }
  };

  const reset = () => {
    setMode(null);
    setState(null);
    setUserInput('');
    setFeedback(null);
  };

  const clearProgress = () => {
    setHighScores([]);
    setProgress({
      contextualUnlocked: false,
      conceptualUnlocked: false
    });
    localStorage.removeItem('social-studies-quiz-scores');
    localStorage.removeItem('social-studies-quiz-progress');
    setIsConfirmingClear(false);
  };

  if (!mode || !state) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] p-6 font-serif">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center justify-center p-3 mb-4 bg-[#5A5A40] text-white rounded-full"
            >
              <GraduationCap size={32} />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-5xl font-light mb-2"
            >
              Social Studies Quiz Master
            </motion.h1>
            <p className="text-[#5A5A40] italic">6th Grade Ancient Civilizations & Geography</p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-white p-8 rounded-[32px] shadow-sm border border-[#E5E5E0] flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-[#F5F5F0] rounded-full flex items-center justify-center mb-6 text-[#5A5A40]">
                <Volume2 size={32} />
              </div>
              <h2 className="text-2xl mb-4">Spelling Challenge</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Listen to the word and type it correctly. Tests your listening and spelling skills.
              </p>
              <button 
                onClick={() => startQuiz('spelling')}
                className="mt-auto w-full py-4 bg-[#5A5A40] text-white rounded-full hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2"
              >
                <Play size={18} /> Start Spelling Quiz
              </button>
            </motion.div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#E5E5E0]">
              <div className="flex items-center gap-2 mb-6 text-[#5A5A40]">
                <BookOpen size={24} />
                <h2 className="text-2xl">Definition Mastery</h2>
              </div>
              
              <div className="space-y-4">
                {/* Level 1: Core Definitions */}
                <button 
                  onClick={() => startQuiz('definition')}
                  className="w-full p-4 rounded-2xl border border-[#E5E5E0] hover:border-[#5A5A40] transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <h3 className="font-semibold text-[#5A5A40]">1. Core Definitions</h3>
                    <p className="text-xs text-gray-500">Identify the term from its full definition.</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#5A5A40]" />
                </button>

                {/* Level 2: Contextual Usage */}
                <button 
                  onClick={() => progress.contextualUnlocked && startQuiz('contextual')}
                  disabled={!progress.contextualUnlocked}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group",
                    progress.contextualUnlocked 
                      ? "border-[#E5E5E0] hover:border-[#5A5A40]" 
                      : "bg-gray-50 border-transparent opacity-60 cursor-not-allowed"
                  )}
                >
                  <div>
                    <h3 className="font-semibold text-[#5A5A40]">
                      2. Contextual Usage {!progress.contextualUnlocked && "🔒"}
                    </h3>
                    <p className="text-xs text-gray-500">Use context clues from example sentences.</p>
                  </div>
                  {progress.contextualUnlocked && <ChevronRight size={18} className="text-gray-300 group-hover:text-[#5A5A40]" />}
                </button>

                {/* Level 3: Deep Concept Mastery */}
                <button 
                  onClick={() => progress.conceptualUnlocked && startQuiz('conceptual')}
                  disabled={!progress.conceptualUnlocked}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group",
                    progress.conceptualUnlocked 
                      ? "border-[#E5E5E0] hover:border-[#5A5A40]" 
                      : "bg-gray-50 border-transparent opacity-60 cursor-not-allowed"
                  )}
                >
                  <div>
                    <h3 className="font-semibold text-[#5A5A40]">
                      3. Deep Concept Mastery {!progress.conceptualUnlocked && "🔒"}
                    </h3>
                    <p className="text-xs text-gray-500">Master specific components of each definition.</p>
                  </div>
                  {progress.conceptualUnlocked && <ChevronRight size={18} className="text-gray-300 group-hover:text-[#5A5A40]" />}
                </button>
              </div>

              {!progress.contextualUnlocked && (
                <p className="mt-4 text-[10px] text-gray-400 italic text-center">
                  Get 70% or higher on Core Definitions to unlock Contextual Usage.
                </p>
              )}
              {progress.contextualUnlocked && !progress.conceptualUnlocked && (
                <p className="mt-4 text-[10px] text-gray-400 italic text-center">
                  Get 70% or higher on Contextual Usage to unlock Deep Concept Mastery.
                </p>
              )}
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="bg-white/50 p-6 rounded-[24px] border border-[#E5E5E0]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#5A5A40]">
                  <History size={20} />
                  <h3 className="font-semibold uppercase tracking-wider text-xs">Recent Performance</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isConfirmingClear ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={clearProgress}
                        className="text-[10px] uppercase tracking-widest text-red-600 hover:text-red-800 font-bold transition-colors"
                      >
                        Confirm Clear
                      </button>
                      <button 
                        onClick={() => setIsConfirmingClear(false)}
                        className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsConfirmingClear(true)}
                      className="text-[10px] uppercase tracking-widest text-red-500 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={10} /> Clear Progress
                    </button>
                  )}
                </div>
              </div>
              {highScores.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No quizzes taken yet.</p>
              ) : (
                <div className="space-y-3">
                  {highScores.map((hs, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-black/5 pb-2">
                      <span className="text-gray-600">{hs.date} - {hs.mode}</span>
                      <span className="font-bold">{hs.score}/{hs.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/50 p-6 rounded-[24px] border border-[#E5E5E0]">
              <div className="flex items-center gap-2 mb-4 text-[#5A5A40]">
                <Settings size={20} />
                <h3 className="font-semibold uppercase tracking-wider text-xs">Quiz Content</h3>
              </div>
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Select Chapter</label>
                <select 
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full p-2 bg-white border border-[#E5E5E0] rounded-lg text-sm outline-none focus:border-[#5A5A40]/30"
                >
                  {CHAPTERS.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Currently using {CHAPTERS.find(c => c.id === selectedChapterId)?.questions.length || 0} terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    const percentage = (state.score / state.questions.length) * 100;
    let feedbackMsg = "Keep practicing!";
    if (percentage >= 90) feedbackMsg = "Outstanding! You're a Social Studies Master!";
    else if (percentage >= 70) feedbackMsg = "Great job! You have a solid understanding.";
    else if (percentage >= 50) feedbackMsg = "Good effort! Review the terms and try again.";

    return (
      <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] p-6 font-serif flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-xl text-center"
        >
          <div className="w-24 h-24 bg-[#F5F5F0] rounded-full flex items-center justify-center mx-auto mb-8 text-[#5A5A40]">
            <Trophy size={48} />
          </div>
          <h2 className="text-4xl font-light mb-2">Quiz Complete!</h2>
          <p className="text-[#5A5A40] italic mb-8">{feedbackMsg}</p>
          
          <div className="text-6xl font-bold mb-2 text-[#5A5A40]">
            {state.score}<span className="text-2xl text-gray-300">/{state.questions.length}</span>
          </div>
          <div className="text-sm text-gray-400 mb-12 uppercase tracking-widest">Final Score</div>

          <div className="space-y-4">
            <button 
              onClick={() => startQuiz(mode)}
              className="w-full py-4 bg-[#5A5A40] text-white rounded-full hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Try Again
            </button>
            <button 
              onClick={reset}
              className="w-full py-4 border-2 border-[#5A5A40] text-[#5A5A40] rounded-full hover:bg-[#5A5A40] hover:text-white transition-all"
            >
              Back to Menu
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] p-6 font-serif">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <button onClick={reset} className="text-[#5A5A40] hover:underline flex items-center gap-1">
            <RotateCcw size={14} /> Quit
          </button>
          <div className="text-sm font-medium text-[#5A5A40] uppercase tracking-widest">
            Question {state.currentIndex + 1} of {state.questions.length}
          </div>
          <div className="text-[#5A5A40] font-bold">
            Score: {state.score}
          </div>
        </header>

        {showSparkles && <SparkleEffect key={showSparkles} type={showSparkles} />}

        <AnimatePresence mode="wait">
          <motion.div 
            key={state.currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-10 rounded-[40px] shadow-sm border border-[#E5E5E0] relative"
          >
            <div className="mb-8">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#5A5A40] font-bold mb-2 block">
                {currentQuestion.category}
              </span>
              
              {mode === 'spelling' ? (
                <div className="flex flex-col items-center py-8">
                  <button 
                    onClick={() => playWord(currentQuestion.word)}
                    disabled={isLoadingAudio}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                      isLoadingAudio ? "bg-gray-100 text-gray-400" : "bg-[#F5F5F0] text-[#5A5A40] hover:scale-110 active:scale-95"
                    )}
                  >
                    {isLoadingAudio ? <Loader2 className="animate-spin" /> : <Volume2 size={32} />}
                  </button>
                  <p className="mt-6 text-sm text-gray-400 italic">Click to hear the word</p>
                </div>
              ) : (
                <div className="py-4">
                  {mode === 'conceptual' && (
                    <div className="text-center mb-6">
                      <h2 className="text-4xl font-bold text-[#5A5A40] tracking-tight uppercase">
                        {currentQuestion.word}
                      </h2>
                      <div className="h-1 w-12 bg-[#5A5A40]/20 mx-auto mt-2 rounded-full" />
                    </div>
                  )}
                  <div className="text-2xl leading-relaxed text-center italic text-[#5A5A40] markdown-body">
                    <Markdown>
                      {state.pickedAlternatives[state.currentIndex] !== -1 
                        ? `"${currentQuestion.alternatives![state.pickedAlternatives[state.currentIndex]].text}"`
                        : `"${currentQuestion.definition}"`}
                    </Markdown>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="relative">
                <input 
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !feedback && handleSubmit()}
                  placeholder={mode === 'spelling' ? "Spell the word..." : "What is this term?"}
                  disabled={!!feedback}
                  className={cn(
                    "w-full py-6 px-8 bg-[#F9F9F7] rounded-2xl text-xl text-center outline-none transition-all border-2",
                    feedback 
                      ? feedback.isCorrect 
                        ? "border-green-200 bg-green-50" 
                        : "border-red-200 bg-red-50"
                      : "border-transparent focus:border-[#5A5A40]/30"
                  )}
                  autoFocus
                />
                {feedback && (
                  <div className={cn(
                    "absolute right-6 top-1/2 -translate-y-1/2",
                    feedback.isCorrect ? "text-green-500" : "text-red-500"
                  )}>
                    {feedback.isCorrect ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className={cn(
                      "text-lg mb-2",
                      feedback.isCorrect ? "text-green-700" : "text-red-700"
                    )}>
                      {feedback.message}
                    </p>
                    {currentQuestion.example && (
                      <p className="text-sm text-gray-500 italic mb-6 max-w-md mx-auto">
                        Example: "{currentQuestion.example}"
                      </p>
                    )}
                    <button 
                      onClick={nextQuestion}
                      className="inline-flex items-center gap-2 py-4 px-12 bg-[#5A5A40] text-white rounded-full hover:bg-[#4A4A30] transition-colors"
                    >
                      {state.currentIndex + 1 === state.questions.length ? "Finish Quiz" : "Next Question"} <ChevronRight size={18} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!feedback && (
                <button 
                  onClick={handleSubmit}
                  disabled={!userInput.trim()}
                  className="w-full py-4 bg-[#5A5A40] text-white rounded-full hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
                >
                  Submit Answer
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
