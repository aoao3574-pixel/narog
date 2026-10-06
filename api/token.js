// POST /api/token
// 로그인한 사용자에게 단축어용 토큰을 새로 발급한다.
// 원본 토큰은 이 응답에서 한 번만 보여주고, DB에는 지문(해시)만 저장한다.

const { sb, hashToken, newToken, getUserFromJwt, bearer, envReady } = require('./_lib.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 가능해요' });
  }
  if (!envReady()) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았어요 (SUPABASE_URL, SUPABASE_SECRET_KEY)' });
  }

  try {
    const user = await getUserFromJwt(bearer(req));
    if (!user) return res.status(401).json({ error: '로그인이 필요해요' });

    const token = newToken();

    // 사용자당 토큰 하나: 새로 발급하면 이전 토큰은 무효
    await sb(`shortcut_tokens?user_id=eq.${user.id}`, { method: 'DELETE' });
    await sb('shortcut_tokens', {
      method: 'POST',
      body: { user_id: user.id, token_hash: hashToken(token) },
    });

    return res.status(200).json({ token });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
