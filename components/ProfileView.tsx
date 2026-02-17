
import React from 'react';
import { UserProfile, Wallet, Transaction } from '../types';
import { getXpForLevel, getPrestigeStyle } from '../utils/xp';

interface ProfileViewProps {
  user: UserProfile;
  wallet: Wallet | null;
  transactions: Transaction[];
  onBack: () => void;
  onDeposit: (amount: number) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, wallet, transactions, onBack, onDeposit }) => {
  const [showCelebration, setShowCelebration] = React.useState(false);

  React.useEffect(() => {
    if (user.level > (user.last_level_notified || 1)) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [user.level, user.last_level_notified]);

  const prestige = getPrestigeStyle(user.level || 1);
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

  const currentLevelXp = getXpForLevel(user.level || 1);
  const nextLevelXp = getXpForLevel((user.level || 1) + 1);
  const xpInCurrentLevel = (user.xp || 0) - currentLevelXp;
  const xpRequiredForNext = nextLevelXp - currentLevelXp;
  const xpProgress = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNext) * 100));

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'prize': return '🏆';
      case 'entry_fee': return '🎮';
      default: return '💰';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Depo MonCash';
      case 'withdrawal': return 'Retrè';
      case 'prize': return 'Gendwa Konkou';
      case 'entry_fee': return 'Patisipasyon';
      default: return 'Tranzaksyon';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-2">
        <button onClick={onBack} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white transition-all border border-white/5">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.3em] text-white">Profil Pam</h1>
        <div className="w-12 h-12"></div> {/* Spacer */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-slate-800 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
            <div className="h-24 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
            <div className={`px-6 pb-8 -mt-12 text-center relative ${showCelebration ? 'animate-pulse' : ''}`}>
              {showCelebration && (
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-ping" />
              )}
              <div className={`w-24 h-24 rounded-[2rem] bg-slate-900 overflow-hidden shadow-2xl mx-auto mb-4 relative z-10 avatar-frame ${prestige.frameClass}`}>
                <img src={user.avatar_url || defaultAvatar} alt="Profile" className="w-full h-full object-cover rounded-[1.8rem]" />
              </div>
              <h2 className={`text-2xl font-black tracking-tight flex items-center justify-center gap-2 ${prestige.textClass}`}>
                @{user.username} {prestige.icon}
              </h2>
              <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest mt-1">
                {user.level || 0} - {user.honorary_title}
              </p>

              <div className="mt-6 p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                  <span>XP: {Math.floor(xpInCurrentLevel)}</span>
                  <span>Rès: {Math.floor(xpRequiredForNext - xpInCurrentLevel)}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${Math.min(100, xpProgress)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-2">
                <span className="bg-white/5 px-4 py-2 rounded-full text-[9px] font-black text-slate-300 uppercase border border-white/5">
                  {user.is_admin ? '🛡️ Admin' : `🎮 ${user.honorary_title || 'Novice'}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-800/50 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gains Konkou</span>
              <span className="text-green-400 font-black">{formatCurrency(wallet?.total_won || 0)}</span>
            </div>
            <div className="h-px bg-white/5"></div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Dépôts</span>
              <span className="text-blue-400 font-black">{formatCurrency(wallet?.total_deposited || 0)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Wallet & Transactions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status / Level Progress Bar */}
          <div className="bg-slate-800/60 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧠</span>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Nivo Syans</span>
                </div>
                <div className="flex justify-baseline gap-2">
                  <span className="text-4xl font-black text-white italic">Nivo {user.level || 1}</span>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded-full">{user.honorary_title || 'Novice'}</span>
                </div>
              </div>

              <div className="flex-1 max-w-md w-full space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Pwogre Nivo</span>
                  <span className="text-lg font-black text-blue-400">{Math.floor(xpProgress)}%</span>
                </div>
                <div className="h-4 w-full bg-slate-900/60 rounded-full border border-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-700 via-blue-400 to-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse transition-all duration-1000"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-600 text-right uppercase tracking-widest italic">Kontinye jwe pou w rive nan nivo pwochèn lan!</p>
              </div>
            </div>
          </div>

          {/* Main Wallet Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <svg className="w-32 h-32 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.9 6 10 6.9 10 8V16C10 17.1 10.9 18 12 18H21M12 16H22V8H12V16M16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" />
              </svg>
            </div>

            <div className="relative z-10 space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Solde Disponib</p>
                <h3 className="text-5xl md:text-6xl font-black text-white tracking-tighter italic">
                  {(user.balance_htg || 0).toLocaleString().split('.')[0]}
                  <span className="text-2xl text-slate-500 not-italic ml-2 uppercase tracking-widest font-bold">HTG</span>
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-slate-900/60 p-4 rounded-3xl border border-white/5">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">Kòb pou Depoze</label>
                  <div className="relative">
                    <input
                      type="number"
                      defaultValue="500"
                      id="depositAmount"
                      className="w-full bg-transparent border-none p-0 text-white font-black text-2xl outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs">HTG</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const amount = (document.getElementById('depositAmount') as HTMLInputElement)?.value;
                    onDeposit(Number(amount) || 500);
                  }}
                  className="px-8 py-5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black rounded-3xl shadow-[0_8px_0_rgb(202,138,4)] active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 shrink-0"
                >
                  <span className="text-xl">⚡</span>
                  Depoze kòb
                </button>
              </div>
            </div>
          </div>

          {/* Transactions History */}
          <div className="bg-slate-800 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h4 className="text-sm font-black uppercase tracking-widest text-white italic">Istoryal Tranzaksyon</h4>
              <span className="bg-slate-900 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 uppercase border border-white/5">Dènye 20 yo</span>
            </div>

            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
              {transactions.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="text-4xl opacity-20">📊</div>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Pa gen tranzaksyon ankò</p>
                </div>
              ) : (
                transactions.map((t) => (
                  <div key={t.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${t.type === 'deposit' || t.type === 'prize' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                        {getTransactionIcon(t.type)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-tight">{getTransactionLabel(t.type)}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black tracking-tight ${t.type === 'deposit' || t.type === 'prize' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {t.type === 'deposit' || t.type === 'prize' ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-[10px]">HTG</span>
                      </p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${t.status === 'completed' ? 'border-green-500/20 text-green-500' :
                        t.status === 'pending' ? 'border-yellow-500/20 text-yellow-500' : 'border-red-500/20 text-red-500'
                        }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {transactions.length > 0 && (
              <div className="p-4 bg-slate-900/40 text-center border-t border-white/5">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Sekirite QuizPam Garanti
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-slate-800 rounded-[3rem] border border-slate-700 overflow-hidden shadow-2xl">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
           <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
        </div>
        
        <div className="px-6 md:px-10 pb-10 -mt-20 relative flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-36 h-36 rounded-[2.5rem] bg-slate-900 border-8 border-slate-800 overflow-hidden shadow-2xl mb-6">
            <img src={user.avatar_url || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
          
          <div className="space-y-2 mb-8">
            <h2 className="text-4xl font-black text-white tracking-tighter">@{user.username}</h2>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-slate-500 font-black uppercase tracking-widest text-[10px] bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700">
                {user.is_admin ? '🛡️ Administrateur' : `🎮 ${user.honorary_title || 'Novice'}`}
              </span>
              <span className="text-blue-400 font-black uppercase tracking-widest text-[10px] bg-blue-400/10 px-4 py-1.5 rounded-full border border-blue-400/20">
                Nivo {user.level || 0}
              </span>
            </div>
          </div>

          {/* XP Progress */}
          <div className="w-full max-w-md space-y-2 mb-10">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              <span>XP: {user.xp || 0}</span>
              <span>Pwochen Nivo: {xpNextLevel}</span>
            </div>
            <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-700 overflow-hidden p-1">
              <div 
                className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, xpProgress)}%` }}
              ></div>
            </div>
          </div>

          {/* Financial Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Solde Actuel */}
            <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-700 flex flex-col items-center justify-center group hover:border-yellow-500/50 transition-all">
              <span className="w-10 h-10 bg-yellow-400/10 text-yellow-400 rounded-xl flex items-center justify-center mb-3">💰</span>
              <p className="text-2xl font-black text-yellow-400 tracking-tight">
                {formatCurrency(wallet?.total_balance || 0)}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Solde Actuel</p>
            </div>

            {/* Gains Totaux */}
            <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-700 flex flex-col items-center justify-center group hover:border-green-500/50 transition-all">
              <span className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mb-3">🏆</span>
              <p className="text-2xl font-black text-green-400 tracking-tight">
                {formatCurrency(wallet?.total_won || 0)}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Gains Totaux</p>
            </div>

            {/* Dépôts */}
            <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-700 flex flex-col items-center justify-center group hover:border-blue-500/50 transition-all">
              <span className="w-10 h-10 bg-blue-400/10 text-blue-400 rounded-xl flex items-center justify-center mb-3">📥</span>
              <p className="text-2xl font-black text-blue-400 tracking-tight">
                {formatCurrency(wallet?.total_deposited || 0)}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Dépôts</p>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={onDeposit}
            className="w-full max-w-md mt-10 py-5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-slate-900 font-black rounded-[2.5rem] shadow-[0_8px_0_rgb(161,98,7)] active:translate-y-2 active:shadow-none transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
          >
            <span className="text-2xl">⚡</span>
            DEPOZE KÒB (MONCASH)
          </button>

          <div className="mt-12 flex items-center justify-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Sekirite MonCash QuizPam</p>
             <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
