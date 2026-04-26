atprotoComments = {
  const tp = theme_properties || {};
  const fg = tp['--theme-foreground'] || '#1a1a2e';
  const fgMuted = tp['--theme-foreground-muted'] || '#666';
  const fgFaintest = tp['--theme-foreground-faintest'] || '#eee';
  const bg = tp['--theme-background'] || '#fff';
  const accent = tp['--theme-foreground-focus'] || '#0085ff';

  return async function atprotoComments(postUrl, opts = {}) {
    const { depth = 10 } = opts;
    if (!postUrl) {
      const el = document.createElement('div');
      el.style.cssText = `color:${fgMuted};font-style:italic`;
      el.textContent = 'No Bluesky post URL provided.';
      return el;
    }
    const m = postUrl.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/);
    if (!m) throw new Error('Invalid Bluesky post URL');
    const handle = m[1], rkey = m[2];
    let did = handle;
    if (!handle.startsWith('did:')) {
      const res = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);
      if (!res.ok) throw new Error(`Failed to resolve handle: ${res.status}`);
      did = (await res.json()).did;
    }
    const uri = `at://${did}/app.bsky.feed.post/${rkey}`;
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=${depth}`);
    if (!res.ok) throw new Error(`Failed to fetch thread: ${res.status}`);
    const thread = (await res.json()).thread;

    function renderComment(node, d = 0, collapsed = false) {
      if (!node || node.$type === 'app.bsky.feed.defs#blockedPost') return '';
      const post = node.post;
      if (!post) return '';
      const author = post.author;
      const record = post.record;
      const postRkey = post.uri.split('/').pop();
      const postLink = `https://bsky.app/profile/${author.handle}/post/${postRkey}`;
      const date = new Date(record.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const avatar = author.avatar
        ? `<img src="${author.avatar}" width="32" height="32" style="border-radius:50%;margin-right:8px;vertical-align:middle">`
        : '';
      const childReplies = node.replies || [];
      const repliesHtml = childReplies.map(r => renderComment(r, d + 1, d >= 0)).join('');
      const hasReplies = childReplies.length > 0;
      const repliesBlock = hasReplies ? `<div class="replies-group" style="display:${collapsed ? 'none' : 'block'}">${repliesHtml}</div>` : '';
      const expandBtn = hasReplies && collapsed
        ? `<button class="expand-btn" onclick="this.style.display='none';this.nextElementSibling.style.display='block'" style="background:none;border:none;color:${accent};cursor:pointer;font-size:0.85em;margin-left:40px;padding:4px 0">▶ ${childReplies.length} ${childReplies.length === 1 ? 'reply' : 'replies'}</button>`
        : '';
      return `<div style="margin-left:${d * 24}px;padding:8px 0;border-bottom:1px solid ${fgFaintest}">
        <div style="display:flex;align-items:center;margin-bottom:4px">
          ${avatar}
          <strong><a href="https://bsky.app/profile/${author.handle}" target="_blank" style="text-decoration:none;color:${fg}">${author.displayName || author.handle}</a></strong>
          <span style="color:${fgMuted};margin-left:8px;font-size:0.85em">@${author.handle} · ${date}</span>
        </div>
        <div style="margin-left:40px;color:${fg}">${record.text}</div>
        <div style="margin-left:40px;margin-top:4px;font-size:0.85em;color:${fgMuted}">
          <a href="${postLink}" target="_blank" style="color:${accent};text-decoration:none" title="Reply on Bluesky">💬 ${post.replyCount || 0}</a>
          · <a href="${postLink}" target="_blank" style="color:${fgMuted};text-decoration:none" title="Repost on Bluesky">↻ ${post.repostCount || 0}</a>
          · <a href="${postLink}" target="_blank" style="color:${fgMuted};text-decoration:none" title="Like on Bluesky">♡ ${post.likeCount || 0}</a>
        </div>
      </div>${expandBtn}${repliesBlock}`;
    }

    const rootHtml = renderComment({...thread, replies: []});
    const repliesHtml = (thread.replies || []).map(r => renderComment(r, 0, true)).join('');
    const container = document.createElement('div');
    container.style.cssText = `font-family:system-ui,sans-serif;max-width:600px;color:${fg}`;
    container.innerHTML = `
      <div style="border-bottom:2px solid ${fg};padding-bottom:8px;margin-bottom:8px">
        ${rootHtml}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 8px">
        <h3 style="margin:0;color:${fg}">Comments (${thread.replies?.length || 0})</h3>
        <button onclick="var p=this.closest('div').parentElement,expanded=this.textContent==='Collapse All';p.querySelectorAll('.replies-group').forEach(el=>el.style.display=expanded?'none':'block');p.querySelectorAll('.expand-btn').forEach(el=>el.style.display=expanded?'':'none');this.textContent=expanded?'Expand All':'Collapse All'" style="background:none;border:1px solid ${fgFaintest};border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.85em;color:${fgMuted}">Expand All</button>
      </div>
      ${repliesHtml}`;
    return container;
  }
}
