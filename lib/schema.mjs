export const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
  password_hash TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sentences (
  id TEXT PRIMARY KEY, language TEXT NOT NULL, text TEXT NOT NULL,
  author_id TEXT REFERENCES users(id), status TEXT NOT NULL CHECK(status IN ('approved','pending','rejected')),
  license TEXT NOT NULL DEFAULT 'CC0-1.0', created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS sentence_unique ON sentences(language, text);
CREATE TABLE IF NOT EXISTS sentence_votes (
  sentence_id TEXT NOT NULL REFERENCES sentences(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
  vote TEXT NOT NULL CHECK(vote IN ('yes','no')), created_at TEXT NOT NULL,
  PRIMARY KEY(sentence_id, reviewer_id)
);
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY, language TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved'
);
CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY, creator_id TEXT NOT NULL REFERENCES users(id), sentence_id TEXT REFERENCES sentences(id),
  prompt_id TEXT REFERENCES prompts(id), kind TEXT NOT NULL CHECK(kind IN ('scripted','spontaneous')),
  language TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, duration_ms INTEGER NOT NULL,
  license TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','flagged')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recording_kind_status ON recordings(kind, status);
CREATE TABLE IF NOT EXISTS recording_votes (
  recording_id TEXT NOT NULL REFERENCES recordings(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
  vote TEXT NOT NULL CHECK(vote IN ('yes','no')), created_at TEXT NOT NULL,
  PRIMARY KEY(recording_id, reviewer_id)
);
CREATE TABLE IF NOT EXISTS recording_reports (
  recording_id TEXT NOT NULL REFERENCES recordings(id), reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(recording_id, reporter_id)
);
CREATE TABLE IF NOT EXISTS transcriptions (
  id TEXT PRIMARY KEY, recording_id TEXT NOT NULL REFERENCES recordings(id), author_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  license TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS transcription_author_unique ON transcriptions(recording_id, author_id);
CREATE TABLE IF NOT EXISTS transcription_votes (
  transcription_id TEXT NOT NULL REFERENCES transcriptions(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
  vote TEXT NOT NULL CHECK(vote IN ('yes','no')), created_at TEXT NOT NULL,
  PRIMARY KEY(transcription_id, reviewer_id)
);
`;

export const seedSentences = [
  'Every voice deserves to be heard.',
  'The morning light came through the open window.',
  'We walked along the quiet shoreline together.',
  'Technology should serve people and communities.',
  'Please remember to water the garden.',
  'A bright blue bicycle stood beside the library.',
  'The train arrived shortly after eight o’clock.',
  'Today is a good day to learn something new.',
  'She carefully placed the letter on the table.',
  'The local museum opened a new exhibition.',
  'How many stars can you see tonight?',
  'Our neighborhood planted trees last weekend.',
  'A gentle breeze moved across the meadow.',
  'The recipe calls for fresh tomatoes and basil.',
  'They found an old photograph in the attic.',
  'The small bakery opens before sunrise.',
  'We should check the weather before leaving.',
  'He practiced the melody every afternoon.',
  'I left my notebook beside the front door.',
  'A friendly dog waited near the park entrance.',
  'Everyone brought a different story to share.',
  'The researchers compared their results carefully.',
  'The river flows past several historic bridges.',
  'Please speak clearly at a comfortable pace.',
  'A cup of tea warmed her hands.'
];
export const seedPrompts = [
  'Describe a place that makes you feel at home.',
  'Tell a short story about a memorable meal.',
  'What is a skill you would like to learn, and why?',
  'Describe your favorite season without naming it.',
  'Talk about a small act of kindness you remember.'
];
