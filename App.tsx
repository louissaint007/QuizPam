
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Question, Contest, Wallet, SoloSyncData } from './types';
import QuizCard from './components/QuizCard';
import GameTimer from './components/GameTimer';
import AdminQuestionManager from './components/AdminQuestionManager';
import AdminStats from './components/AdminStats';
import AdminContestManager from './components/AdminContestManager';
import Auth from './components/Auth';
import ProfileView from './components/ProfileView';
import ContestDetailView from './components/ContestDetailView';
import FinalistArena from './components/FinalistArena';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const MONCASH_GATEWAY_URL = 'https://page-moncash-quiz-pam.vercel.app/';

// Eleman vizyèl pou chajman (Skeleton)
const SkeletonCard = () => (
  <div className="bg-slate-800 rounded-[2.5rem] border border-white/5 overflow-hidden h-96 animate-pulse">
    <div className="h-48 bg-slate-700/50"></div>
    <div className="p-8 space-y-4">
      <div className="flex justify-between">
        <div className="h-6 w-20 bg-slate-700/50 rounded-lg"></div>
        <div className="h-6 w-24 bg-slate-700/50 rounded-lg"></div>
      </div>
      <div className="h-12 w-full bg-slate-700/50 rounded-2xl"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'home' | 'solo' | 'contest' | 'admin' | 'auth' | 'profile' | 'contest-detail' | 'finalist-arena'>('home');
  const [adminTab, setAdminTab] = useState<'stats' | 'questions' | 'contests'>('stats');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result'>('ready');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isShowingCorrect, setIsShowingCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [gameAnswers, setGameAnswers] = useState<{ questionId: string, isCorrect: boolean, timeSpent: number }[]>([]);

  // Timer reference for ms tracking
  const questionStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (pending) setHasPendingSync(true);
  }, []);

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // 1. Chanèl pou Konkou yo (Tout moun wè chanjman imedyatman)
    const contestChannel = supabase
      .channel('public:contests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContests((prev) => [payload.new as Contest, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContests((prev) => prev.map((c) => (c.id === payload.new.id ? (payload.new as Contest) : c)));
        } else if (payload.eventType === 'DELETE') {
          setContests((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      })
      .subscribe();

    // 2. Chanèl pou Wallet (Si itilizatè a konekte, li wè balans li chanje imedyatman si admin lan fè yon depo oswa si li peye)
    let walletChannel: RealtimeChannel | null = null;
    if (user) {
      walletChannel = supabase
        .channel(`public:wallets:user_id=eq.${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, (payload) => {
           setWallet(payload.new as Wallet);
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(contestChannel);
      if (walletChannel) supabase.removeChannel(walletChannel);
    };
  }, [user]);

  const fetchContests = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      // Nou pa mete setIsLoading(true) isit la pou evite flash loading lè nou jis ap refresh data
      const { data, error } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setContests(data || []);
    } catch (err: any) {
      console.error("Fetch contests failed:", err);
    }
  }, []);

  const fetchUserAndWallet = async (userId: string, currentSession: any) => {
    try {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle()
      ]);
      if (profileRes.error) throw profileRes.error;
      const userEmail = currentSession?.user?.email;
      let currentUser = profileRes.data;
      if (!currentUser) {
        const { data: created } = await supabase.from('profiles').upsert({
          id: userId,
          username: currentSession?.user?.user_metadata?.username || `Jwe_${userId.slice(0, 4)}`,
          balance_htg: 0, solo_level: 1, honorary_title: 'Novice'
        }).select().single();
        currentUser = created;
      }
      setUser({ ...currentUser, email: userEmail } as UserProfile);
      if (walletRes.data) setWallet(walletRes.data as Wallet);
    } catch (err) { console.error(err); }
  };

  const uploadResults = async (data: SoloSyncData) => {
    setIsSyncing(true);
    try {
      await supabase.from('game_sessions').update({
        is_completed: true,
        score: data.score,
        total_time_ms: data.total_time_ms
      }).eq('id', data.sessionId);

      const progressData = data.answers.map(ans => ({
        user_id: data.userId,
        question_id: ans.questionId,
        is_correct: ans.isCorrect
      }));
      await supabase.from('user_solo_progress').insert(progressData);

      const { data: competitors } = await supabase
        .from('game_sessions')
        .select('id, score, total_time_ms')
        .eq('contest_id', selectedContest?.id || '')
        .neq('user_id', data.userId)
        .eq('score', data.score)
        .eq('total_time_ms', data.total_time_ms);

      if (competitors && competitors.length > 0) {
        await supabase.from('game_sessions').update({ is_finalist: true }).eq('id', data.sessionId);
        for (const comp of competitors) {
          await supabase.from('game_sessions').update({ is_finalist: true }).eq('id', comp.id);
        }
      }

      localStorage.removeItem('quizpam_sync_queue');
      setHasPendingSync(false);
      return true;
    } catch (err) {
      localStorage.setItem('quizpam_sync_queue', JSON.stringify(data));
      setHasPendingSync(true);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPending = async () => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (!pending) return;
    await uploadResults(JSON.parse(pending));
  };

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      // Kòmanse chajman inisyal la
      setIsLoading(true);
      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(currentSession);
      
      // Nou fè tout apèl yo an paralèl
      const promises = [fetchContests()];
      if (currentSession) {
        promises.push(fetchUserAndWallet(currentSession.user.id, currentSession));
        syncPending();
      }
      
      await Promise.all(promises);
      setIsLoading(false);
    };

    initAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) await fetchUserAndWallet(currentSession.user.id, currentSession);
      setIsLoading(false);
    });
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [fetchContests]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWallet(null);
    setView('home');
    setGameState('ready');
    setIsMobileMenuOpen(false);
  };

  const startGame = async (mode: 'solo' | 'contest' | 'finalist') => {
    if (!session || !user) { setView('auth'); return; }
    // Pou start game, nou kenbe loader fullscreen paske se yon tranzisyon kritik
    setIsLoading(true);
    setError(null);
    try {
      let selectedIds: string[] = [];

      if (mode === 'finalist') {
        const { data: expertPool } = await supabase
          .from('questions')
          .select('id')
          .eq('difficulty', 4)
          .limit(10);
        selectedIds = (expertPool || []).map(q => q.id).sort(() => Math.random() - 0.5);
      } else if (mode === 'solo') {
        const { data: seenData } = await supabase.from('user_solo_progress').select('question_id').eq('user_id', user.id);
        const seenIds = seenData?.map(d => d.question_id) || [];
        let query = supabase.from('questions').select('id').eq('is_for_solo', true);
        if (seenIds.length > 0) query = query.not('id', 'in', `(${seenIds.join(',')})`);
        const { data: idPool } = await query;
        if (!idPool || idPool.length < 5) throw new Error("Ou fini tout kesyon solo yo! Nou pral ajoute lòt byento.");
        selectedIds = idPool.map(q => q.id).sort(() => Math.random() - 0.5).slice(0, 10);
      } else if (mode === 'contest' && selectedContest?.questions_ids) {
        selectedIds = selectedContest.questions_ids;
      }

      const { data: gameSession, error: sessErr } = await supabase.from('game_sessions').insert({
        user_id: user.id,
        contest_id: mode === 'contest' || mode === 'finalist' ? selectedContest?.id : null,
        questions_ids: selectedIds,
        is_completed: false
      }).select().single();
      if (sessErr) throw sessErr;

      const { data: fullQuestions } = await supabase.from('questions').select('*').in('id', selectedIds);

      setQuestions(fullQuestions as Question[]);
      setActiveSessionId(gameSession.id);
      setCurrentIndex(0);
      setScore(0);
      setTotalTimeMs(0);
      setGameAnswers([]);
      setGameState('playing');
      setView('solo');
      setIsMobileMenuOpen(false);
      questionStartTimeRef.current = Date.now();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (idx: number) => {
    if (isShowingCorrect || gameState !== 'playing') return;

    const timeSpent = Date.now() - questionStartTimeRef.current;
    const isTimeout = idx === -1;
    const currentQ = questions[currentIndex];
    const isCorrect = !isTimeout && idx === currentQ.correct_index;

    setSelectedAnswer(idx);
    if (!isTimeout) setIsShowingCorrect(true);

    const points = isCorrect ? (100 + Math.floor(timeLeft * 10)) : 0;
    const newScore = score + points;
    const newTotalTime = totalTimeMs + timeSpent;

    if (isCorrect) setScore(newScore);
    setTotalTimeMs(newTotalTime);

    const newAnswers = [...gameAnswers, { questionId: currentQ.id, isCorrect, timeSpent }];
    setGameAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setSelectedAnswer(null);
        setIsShowingCorrect(false);
        setTimeLeft(10);
        setCurrentIndex(prev => prev + 1);
        questionStartTimeRef.current = Date.now();
      } else {
        setGameState('result');
        const finalData: SoloSyncData = {
          sessionId: activeSessionId!,
          userId: user!.id,
          score: newScore,
          total_time_ms: newTotalTime,
          answers: newAnswers
        };
        uploadResults(finalData);
      }
    }, isTimeout ? 800 : 1200);
  };

  const redirectToMonCash = (amount: number, type: 'deposit' | 'contest_entry', contestId?: string) => {
    if (!user) { setView('auth'); return; }
    const params = new URLSearchParams({
      userId: user.id,
      username: user.username,
      amount: amount.toString(),
      type: type,
      description: type === 'deposit' ? 'Depo Balans QuizPam' : `Antre Konkou`,
    });
    if (contestId) params.append('contestId', contestId);
    window.location.href = `${MONCASH_GATEWAY_URL}?${params.toString()}`;
  };

  // Navigasyon toujou vizib, menm pandan chajman
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-red-500/30">
      <nav className="bg-slate-800/80 backdrop-blur-2xl border-b border-white/5 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button onClick={() => { setView('home'); setGameState('ready'); setIsMobileMenuOpen(false); }} className="active:scale-95 transition-transform flex items-center gap-2">
            <span className="text-2xl md:text-3xl font-black tracking-tighter flex items-center">
              <span className="text-red-500 italic">Quiz</span><span className="text-white">Pam</span>
            </span>
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Realtime</span>
            </div>
          </button>

          <div className="flex items-center space-x-3 md:space-x-6">
            {hasPendingSync && (
              <button onClick={syncPending} disabled={isSyncing} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl text-[8px] md:text-[9px] font-black text-yellow-500 uppercase animate-pulse">
                <span>{isSyncing ? '🔄 Sync...' : '🔄 Offline'}</span>
              </button>
            )}

            {/* Skeleton pou User Profile si chajman an kous */}
            {isLoading && !user ? (
              <div className="h-10 w-32 bg-slate-800 rounded-2xl animate-pulse"></div>
            ) : (
              session && user && (
                <button onClick={() => setView('profile')} className="flex items-center space-x-2 md:space-x-3 group bg-slate-900/60 p-1 pr-3 md:pr-4 rounded-2xl border border-white/10 hover:border-blue-500 transition-all shadow-lg">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden border border-slate-700">
                    <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-right">
                    <p className="hidden xs:block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Balans</p>
                    <p className="text-yellow-400 font-black text-xs md:text-sm">{(wallet?.total_balance || 0).toLocaleString()} <span className="text-[10px]">HTG</span></p>
                  </div>
                </button>
              )
            )}

            {!session && !isLoading && (
              <button onClick={() => setView('auth')} className="text-[10px] font-black uppercase tracking-widest bg-blue-600 px-6 py-2.5 rounded-xl shadow-xl hover:bg-blue-500 transition-all">Koneksyon</button>
            )}

            {user?.is_admin && (
              <button onClick={() => setView('admin')} className="hidden md:flex p-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-slate-300 transition-all border border-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            )}

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-white bg-slate-800 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900 md:hidden flex flex-col p-8 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-12">
            <span className="text-2xl font-black italic"><span className="text-red-500">Quiz</span>Pam</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-800 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <button onClick={() => { setView('home'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Lobby <span>🏠</span></button>
            {user && (
              <>
                <button onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Profil & Depo <span>💰</span></button>
                {user.is_admin && <button onClick={() => { setView('admin'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Admin <span>🛡️</span></button>}
              </>
            )}
          </div>
          <div className="pt-8 border-t border-white/5 mt-auto">
            {user ? (
              <button onClick={handleLogout} className="w-full py-5 bg-red-500/10 text-red-500 font-black rounded-3xl uppercase tracking-widest text-xs border border-red-500/20">Dekonekte</button>
            ) : (
              <button onClick={() => { setView('auth'); setIsMobileMenuOpen(false); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase tracking-widest text-xs">Koneksyon</button>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 font-bold text-center uppercase text-xs">{error}</div>}

        {view === 'auth' && <Auth onAuthComplete={() => setView('home')} />}
        {view === 'profile' && user && <ProfileView user={user} wallet={wallet} onBack={() => setView('home')} onDeposit={() => redirectToMonCash(500, 'deposit')} />}
        {view === 'contest-detail' && selectedContest && (
          <ContestDetailView contest={selectedContest} userBalance={wallet?.total_balance || 0} onBack={() => setView('home')} onJoin={() => redirectToMonCash(selectedContest.entry_fee, 'contest_entry', selectedContest.id)} />
        )}
        {view === 'finalist-arena' && selectedContest && (
          <FinalistArena contestTitle={selectedContest.title} onStartFinal={() => startGame('finalist')} />
        )}

        {view === 'home' && (
          <div className="space-y-16 py-10">
            <header className="text-center space-y-6">
              <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 leading-none animate-in fade-in slide-in-from-top-10 duration-700">
                CHWAZI <span className="text-red-500">DEFI W</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs animate-in fade-in duration-1000">Gagner des prix réels en testant votre culture</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Solo Card */}
              <div className="relative group overflow-hidden bg-slate-800 rounded-[3rem] p-8 border border-white/5 hover:border-blue-500 transition-all cursor-pointer" onClick={() => startGame('solo')}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full group-hover:bg-blue-600/20 transition-all"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-transform">🕹️</div>
                    <h3 className="text-3xl font-black text-white leading-tight">MÒD <br/> PRATIK SOLO</h3>
                    <p className="text-slate-400 text-sm font-medium">Antrene w san limit epi monte nivo pou w vin yon mèt.</p>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Kòmanse Jwe</span>
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* SKELETON LOADING STATE */}
              {isLoading && contests.length === 0 ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                /* Contest Cards */
                contests.map(c => (
                  <div key={c.id} className="bg-slate-800 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col group hover:scale-[1.02] transition-all shadow-2xl relative animate-in fade-in zoom-in duration-500">
                    {c.status === 'active' && (
                      <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
                      </div>
                    )}
                    <div className="h-56 bg-slate-700 bg-cover bg-center flex items-end p-8 relative" style={c.image_url ? { backgroundImage: `linear-gradient(to bottom, transparent, rgba(15, 23, 42, 1)), url(${c.image_url})` } : {}}>
                      {!c.image_url && <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-10">🏆</div>}
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{c.title}</h4>
                    </div>
                    <div className="p-8 space-y-6 bg-slate-800 flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pri Antre</p>
                          <p className="text-yellow-400 font-black text-xl">{c.entry_fee} <span className="text-xs">HTG</span></p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Gwo Pri Pool</p>
                          <p className="text-green-400 font-black text-xl">{c.total_prize_pool || c.grand_prize} <span className="text-xs">HTG</span></p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedContest(c); setView('contest-detail'); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-lg active:translate-y-1">Mwen vle patisipe</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Game play logic */}
        {gameState === 'playing' && questions[currentIndex] && (
          <div className="max-w-3xl mx-auto pt-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8 px-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kesyon {currentIndex + 1} / {questions.length}</span>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-400 block tracking-tighter">{score} <span className="text-xs">PTS</span></span>
              </div>
            </div>
            <QuizCard
              question={questions[currentIndex]}
              onSelect={handleSelect}
              selectedId={selectedAnswer}
              showCorrect={isShowingCorrect}
            />
            {!isShowingCorrect && (
              <GameTimer
                duration={10}
                onTimeUp={() => handleSelect(-1)}
                isActive={gameState === 'playing' && !isShowingCorrect}
                onTick={setTimeLeft}
              />
            )}
          </div>
        )}

        {gameState === 'result' && (
          <div className="text-center py-20 space-y-8 animate-in zoom-in">
            <div className="w-32 h-32 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto text-6xl mb-4 shadow-[0_0_50px_rgba(234,179,8,0.2)]">🏆</div>
            <h2 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter uppercase leading-none">SCORE <br/> {score}</h2>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs">Tan Total: {(totalTimeMs / 1000).toFixed(2)}s</p>
            </div>
            <div className="pt-8">
              <button onClick={() => { setView('home'); setGameState('ready'); }} className="bg-blue-600 text-white px-16 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:translate-y-2 transition-all hover:bg-blue-500">Tounen Lobby</button>
            </div>
          </div>
        )}

        {view === 'admin' && user?.is_admin && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
              <button onClick={() => setAdminTab('stats')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'stats' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Stats</button>
              <button onClick={() => setAdminTab('questions')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'questions' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Kesyon</button>
              <button onClick={() => setAdminTab('contests')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'contests' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Konkou</button>
            </div>
            {adminTab === 'stats' && <AdminStats />}
            {adminTab === 'questions' && <AdminQuestionManager />}
            {adminTab === 'contests' && <AdminContestManager />}
          </div>
        )}
      </main>

      <footer className="mt-auto py-12 text-center border-t border-white/5 opacity-50">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-600">© 2025 QuizPam - GITHUB SYNC VERSION</p>
      </footer>
    </div>
  );
};

export default App;
