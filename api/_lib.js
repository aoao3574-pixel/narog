// 서버 함수들이 같이 쓰는 도구 모음
// 파일 이름이 _ 로 시작하면 Vercel이 주소(/api/...)로 노출하지 않음

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY; // 관리자 열쇠. Vercel 환경변수에만 존재
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gLb0GeDp2S1pBJ7l8eDHDw_WcTjBA-D'; // 공개용 값

// Supabase DB 호출 (관리자 권한: RLS를 건너뛰므로 반드시 user_id 조건을 직접 붙일 것)
async function sb(path, options = {}) {
  const headers = { apikey: SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' };
  if (options.prefer) headers.Prefer = options.prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) {
    const detail = data && data.message ? data.message : text;
    throw new Error(`DB 오류 (${res.status}): ${detail}`);
  }
  return data;
}

// 토큰 원본 대신 저장하는 지문
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newToken() {
  return 'sch_' + crypto.randomBytes(24).toString('base64url');
}

// 웹에서 로그인한 사용자의 로그인 증표(JWT)가 진짜인지 Supabase에 확인
async function getUserFromJwt(jwt) {
  if (!jwt) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && user.id ? user : null;
}

function bearer(req) {
  const header = req.headers.authorization || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function envReady() {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}

module.exports = { sb, hashToken, newToken, getUserFromJwt, bearer, envReady };
