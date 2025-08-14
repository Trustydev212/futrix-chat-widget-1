(function(){
  const el = document.currentScript;
  const API_URL = el.dataset.api;
  const TITLE   = el.dataset.title || 'Trợ lý AI';
  const PRI     = el.dataset.color || '#0b5bd3';
  const CHIPS   = (el.dataset.chips || '').split('|').filter(Boolean);
  const MODE    = (el.dataset.mode || 'overlay').toLowerCase(); // 'inline' | 'overlay'
  const TARGET  = el.dataset.target || '';                      // ví dụ '#fx-slot'
  const H       = el.dataset.height || '560';                   // desktop height
  const MH      = el.dataset.mheight || '70vh';                 // mobile height

  if(!API_URL){ console.warn('[ChatPage] Missing data-api'); return; }
  const toUnit = v => /^\d+(\.\d+)?$/.test(String(v)) ? (v+'px') : String(v);

  // ===== CSS chung =====
  const baseCss = `
  :root{ --pri:${PRI}; --bg:#fff; --txt:#0f172a; --mut:#6b7280; --b:#e5e7eb }
  .fx-wrap{height:100%; max-width:1024px; margin:0 auto; padding:16px; box-sizing:border-box}
  .fx-card{display:flex; flex-direction:column; height:100%; background:var(--bg); border:1px solid var(--b);
    border-radius:16px; box-shadow:0 18px 40px rgba(0,0,0,.08); overflow:hidden}
  .fx-head{padding:14px 16px; border-bottom:1px solid var(--b); display:flex; gap:12px; align-items:center}
  .fx-logo{width:40px;height:40px;border-radius:10px;background:var(--pri); display:grid;place-items:center;color:#fff;font-weight:800}
  .fx-title{font-weight:700; font-size:1.2em}
  .fx-status{margin-left:auto;font-size:.95em;color:var(--mut)}
  .fx-body{flex:1 1 auto; min-height:0; padding:16px; overflow:auto; background:#fbfdff}
  .fx-msg{display:flex; gap:10px; margin:10px 0}
  .fx-msg--me{justify-content:flex-end}
  .fx-bubble{max-width:75%; padding:10px 12px; border-radius:14px; border:1px solid var(--b); background:#eef4ff; font-size:1em; line-height:1.6}
  .fx-msg--me .fx-bubble{background:#eaffea; border-color:#c8f5c8}
  .fx-typing{font-size:.95em; color:var(--mut); margin:0 16px 8px}
  .fx-chipbar{display:flex; gap:8px; flex-wrap:wrap; margin:6px 16px 0}
  .fx-chip{background:#eef2ff; border:1px solid #dbe3ff; color:#243b77; border-radius:999px; padding:6px 10px; font-size:.95em; cursor:pointer}
  .fx-foot{border-top:1px solid var(--b); padding:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap}
  .fx-inp{flex:1; border:1px solid var(--b); border-radius:12px; padding:12px 14px; font-size:1em; outline:none}
  .fx-send{background:var(--pri); color:#fff; border:none; border-radius:12px; padding:12px 16px; font-weight:600; cursor:pointer; font-size:.95em}
  .fx-tools{margin-left:auto; display:flex; gap:8px}
  .fx-btn{background:transparent; border:1px solid var(--b); border-radius:10px; padding:8px 10px; font-size:.95em; cursor:pointer; color:#334155}
  @media (max-width:640px){ .fx-wrap{padding:10px} .fx-bubble{max-width:86%} }
  `;

  // ===== CSS cho 2 mode =====
  const overlayCss = `
  html,body{height:100%;margin:0}
  body.fx-noscroll{overflow:hidden}
  :root{ --vh:1vh }
  #fx-chatpage{position:fixed; inset:0; z-index:2147483000; width:100vw; height:calc(var(--vh)*100);
    background:linear-gradient(180deg,#f6f9ff,#fff); font-family:Inter,system-ui,Arial; color:var(--txt);
    padding-top:env(safe-area-inset-top); padding-bottom:env(safe-area-inset-bottom)}
  `;
  const inlineCss = (h, mh) => `
  /* inline: chiếm đúng khối chứa */
  #fx-chatpage{ position:relative; inset:auto; width:100%; height:${toUnit(h)};
    background:linear-gradient(180deg,#f6f9ff,#fff); font-family:Inter,system-ui,Arial; color:var(--txt); }
  @media (max-width:640px){ #fx-chatpage{ height:${toUnit(mh)}; } }
  `;

  // ===== HTML skeleton =====
  const shell = `
    <div class="fx-wrap">
      <div class="fx-card">
        <div class="fx-head">
          <div class="fx-logo">FX</div>
          <div class="fx-title">${TITLE}</div>
          <div class="fx-status" id="fxStatus">Online</div>
        </div>
        <div class="fx-body" id="fxBody">
          <div class="fx-msg"><div class="fx-bubble">Chào bạn 👋 Mình là trợ lý AI của FUTRIX. Bạn cần hỗ trợ gì?</div></div>
        </div>
        <div id="fxTyping" class="fx-typing" style="display:none">AI đang soạn trả lời…</div>
        <div class="fx-chipbar" id="fxChips">${CHIPS.map(c=>`<span class="fx-chip">${c}</span>`).join('')}</div>
        <div class="fx-foot">
          <input id="fxInput" class="fx-inp" placeholder="Nhập câu hỏi và nhấn Enter…">
          <button id="fxSend" class="fx-send">Gửi</button>
          <div class="fx-tools">
            <button class="fx-btn" id="fxClear">Xoá hội thoại</button>
            <button class="fx-btn" id="fxExport">Tải transcript</button>
          </div>
        </div>
      </div>
    </div>`;

  // ===== inject CSS + mount =====
  const S=document.createElement('style'); S.textContent = baseCss + (MODE==='inline' ? inlineCss(H,MH) : overlayCss); document.head.appendChild(S);

  // tạo node root
  const root = document.createElement('div'); root.id = 'fx-chatpage'; root.innerHTML = shell;

  // mount
  let mountEl = null;
  if (MODE === 'inline' && TARGET) mountEl = document.querySelector(TARGET);
  if (MODE === 'inline' && mountEl) {
    mountEl.innerHTML = ''; // dọn placeholder
    mountEl.appendChild(root);
  } else {
    document.body.appendChild(root);
    // overlay: khóa scroll + fix 100vh mobile
    document.body.classList.add('fx-noscroll');
    const setVH=()=>document.documentElement.style.setProperty('--vh',(window.innerHeight*0.01)+'px');
    setVH(); addEventListener('resize',setVH); addEventListener('orientationchange',setVH);
  }

  // ===== JS chat =====
  const $=id=>document.getElementById(id);
  const body=$('fxBody'), input=$('fxInput'), send=$('fxSend'), clearBtn=$('fxClear'), exportBtn=$('fxExport'), typing=$('fxTyping'), chips=$('fxChips');

  const KEY='fx_chat_history_v1';
  let history=[]; try{ history = JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{}
  for(const m of history) append(m.role,m.content);

  function append(role,text){
    const wrap=document.createElement('div');
    wrap.className='fx-msg'+(role==='user'?' fx-msg--me':'');
    const b=document.createElement('div'); b.className='fx-bubble'; b.textContent=text;
    wrap.appendChild(b); body.appendChild(wrap); body.scrollTop=body.scrollHeight;
  }
  function persist(role,content){
    history.push({role,content}); if(history.length>60) history.shift();
    localStorage.setItem(KEY, JSON.stringify(history));
  }

  async function ask(text){
    if(!text) return;
    append('user',text); persist('user',text);
    input.value=''; typing.style.display='block';
    try{
      const r = await fetch(API_URL,{ method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{role:'user',content:text}] }) });
      const data = await r.json();
      const reply = data.content || (data.error ? `Lỗi máy chủ (${data.status||''}).` : 'Xin lỗi, mình chưa có phản hồi.');
      append('assistant', reply); persist('assistant', reply);
    }catch(e){ append('assistant','Kết nối lỗi (CORS/mạng).'); }
    finally{ typing.style.display='none'; }
  }

  send.addEventListener('click', ()=>ask(input.value.trim()));
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); ask(input.value.trim()); }});
  if (chips) chips.addEventListener('click', e=>{ if(e.target.classList.contains('fx-chip')) ask(e.target.textContent.trim()); });

  clearBtn.addEventListener('click', ()=>{
    if(confirm('Xoá toàn bộ hội thoại?')){
      history=[]; localStorage.removeItem(KEY);
      body.innerHTML='<div class="fx-msg"><div class="fx-bubble">Bắt đầu cuộc trò chuyện mới 👋</div></div>';
    }
  });
  exportBtn.addEventListener('click', ()=>{
    const lines = history.map(m => (m.role==='user'?'Bạn: ':'AI: ')+m.content).join('\n');
    const blob = new Blob([lines], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href:url, download:'futrix-chat-transcript.txt'});
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
})();
