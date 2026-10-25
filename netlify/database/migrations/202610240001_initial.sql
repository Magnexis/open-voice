-- Magnexis Voice: portable PostgreSQL schema + original CC0 text.

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

INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('54834daaca0ba41ccdb37bdc4f38f577', 'en', 'Every voice deserves to be heard.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('ea117cfbca8a78ae0435c74585bef62e', 'en', 'The morning light came through the open window.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('8df2766453893de7029c846ba0c69351', 'en', 'We walked along the quiet shoreline together.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('b1bf7f8b409243e12cb8f803f4e00b6e', 'en', 'Technology should serve people and communities.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('7711aa0a356e3718ca6c42c162cd1c16', 'en', 'Please remember to water the garden.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('615958c18907e22b71d34cdb057e180a', 'en', 'A bright blue bicycle stood beside the library.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('de8b38fe20f34af0f6200bdb159d7096', 'en', 'The train arrived shortly after eight o’clock.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('cf8d2c47ff443c350e88e834beec23b3', 'en', 'Today is a good day to learn something new.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('58d67748f7b9e53e1816492d7132c3e9', 'en', 'She carefully placed the letter on the table.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('77a5c07d7f679b4e956682af825a4fed', 'en', 'The local museum opened a new exhibition.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('37f59b82ec668c01d3e1bbbf305430b5', 'en', 'How many stars can you see tonight?', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('0535fb7fe70e4e05a702c4603b7ab7ef', 'en', 'Our neighborhood planted trees last weekend.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('2718a4559e140682a5cecc930496004b', 'en', 'A gentle breeze moved across the meadow.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('6870366952f7c3bb57a5be1401f1d048', 'en', 'The recipe calls for fresh tomatoes and basil.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('ff8b3667c40f6b7be64b5393f8fbe276', 'en', 'They found an old photograph in the attic.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('f2a92446c804b0c67ed24e433b7b7afb', 'en', 'The small bakery opens before sunrise.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('92ab05d05665aa5ab8f1a37116d8c5cd', 'en', 'We should check the weather before leaving.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('e41faeaef1c7c5445eadebcb7948d3eb', 'en', 'He practiced the melody every afternoon.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('8a18e0500dd1d130e6000de2b1c1f65b', 'en', 'I left my notebook beside the front door.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('49ca1e062c0784a9ce7dd7207d55a38c', 'en', 'A friendly dog waited near the park entrance.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('9e4982b3172195680a3baa4d588e1446', 'en', 'Everyone brought a different story to share.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('2fc5ee14d913348ec022a73a589b775d', 'en', 'The researchers compared their results carefully.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('0cd7480cc24c90611b66aedd28cda605', 'en', 'The river flows past several historic bridges.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('21624c914d83bb917165ea6e57f7ffed', 'en', 'Please speak clearly at a comfortable pace.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO sentences (id, language, text, author_id, status, license, created_at) VALUES ('928fff8e249fb6f6962ae5eeb70dc1c9', 'en', 'A cup of tea warmed her hands.', NULL, 'approved', 'CC0-1.0', '2026-01-01T00:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO prompts (id, language, text, status) VALUES ('7290a3185e3eb10bbc5f49dda5a4b3e6', 'en', 'Describe a place that makes you feel at home.', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO prompts (id, language, text, status) VALUES ('d07db1b520b4ccec8dd9ceeff0ad9a01', 'en', 'Tell a short story about a memorable meal.', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO prompts (id, language, text, status) VALUES ('f23a870a6331843481684fc14e14d558', 'en', 'What is a skill you would like to learn, and why?', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO prompts (id, language, text, status) VALUES ('50bd8db6ed98fae39c052793e181c287', 'en', 'Describe your favorite season without naming it.', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO prompts (id, language, text, status) VALUES ('361da642bc91e8bb1b5635a49f1e3fb1', 'en', 'Talk about a small act of kindness you remember.', 'approved') ON CONFLICT DO NOTHING;
