
-- --- UPDATED SUPABASE SCHEMA (GITHUB SYNCED) ---

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  balance_htg DECIMAL DEFAULT 0,
  solo_level INTEGER DEFAULT 1,
  honorary_title TEXT DEFAULT 'Novice',
  total_wins INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_balance DECIMAL DEFAULT 0,
  total_deposited DECIMAL DEFAULT 0,
  total_withdrawn DECIMAL DEFAULT 0,
  total_won DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, 
  correct_index INTEGER NOT NULL,
  is_for_contest BOOLEAN DEFAULT true,
  is_for_solo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contests table (SYNCED WITH GITHUB SCHEMA)
CREATE TABLE IF NOT EXISTS contests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  entry_fee NUMERIC NOT NULL,
  min_participants INTEGER NOT NULL,
  current_participants INTEGER DEFAULT 0,
  total_prize_pool NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_margin_percent NUMERIC DEFAULT 50.0,
  first_prize_percent NUMERIC DEFAULT 20.0,
  second_prize_percent NUMERIC DEFAULT 8.0,
  third_prize_percent NUMERIC DEFAULT 2.0,
  fourth_prize_percent NUMERIC DEFAULT 0.0,
  fifth_prize_percent NUMERIC DEFAULT 0.0,
  sixth_prize_percent NUMERIC DEFAULT 0.0,
  seventh_prize_percent NUMERIC DEFAULT 0.0,
  eighth_prize_percent NUMERIC DEFAULT 0.0,
  ninth_prize_percent NUMERIC DEFAULT 0.0,
  tenth_prize_percent NUMERIC DEFAULT 0.0,
  image_url TEXT,
  grand_prize BIGINT DEFAULT 0,
  winners_count INTEGER DEFAULT 10,
  category_filter TEXT DEFAULT 'Tous',
  difficulty_filter INTEGER DEFAULT 1,
  questions_ids UUID[] -- Si w vle kenbe lis kesyon yo dirèkteman
);

-- User Solo Progress
CREATE TABLE IF NOT EXISTS user_solo_progress (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN DEFAULT false,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  questions_ids UUID[] NOT NULL,
  current_index INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  total_time_ms BIGINT DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_finalist BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
