(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('data').textContent);
  const page = document.body.dataset.page;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = n => Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  const telHref = p => 'tel:+351' + String(p).replace(/\D/g, '');
  const waHref = (n, text) => 'https://wa.me/351' + n + (text ? '?text=' + encodeURIComponent(text) : '');

  // ---------- owner accept/decline ----------
  function ownerLink(yes) {
    const O = window.OWNER || {};
    const msg = yes
      ? `Olá João! Vimos a demonstração do site para o ${D.name} e gostávamos de avançar / saber mais.`
      : `Olá João, obrigado pela demonstração para o ${D.name}, mas de momento não temos interesse.`;
    if (O.whatsapp) return 'https://wa.me/' + O.whatsapp + '?text=' + encodeURIComponent(msg);
    if (O.email) return 'mailto:' + O.email + '?subject=' + encodeURIComponent((yes ? 'Quero avançar — ' : 'Sem interesse — ') + D.name) + '&body=' + encodeURIComponent(msg);
    return '#proposta';
  }
  document.querySelectorAll('[data-owner]').forEach(a => {
    a.href = ownerLink(a.dataset.owner === 'yes');
    if (a.href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  });

  // ---------- menu tabs (shared) ----------
  function tabs(container, onPick) {
    container.innerHTML = D.menu.map((c, i) =>
      `<button class="tab" type="button" role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(c.category)}</button>`).join('');
    container.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      container.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', x === b));
      onPick(+b.dataset.i);
    });
  }
  const tagHtml = tags => (tags || []).map(x => `<span class="tag tag-${esc(x)}">${esc(x === 'veg' ? 'vegetariano' : x)}</span>`).join('');

  if (page === 'landing') landing();
  if (page === 'mesa') mesa();
  if (page === 'cozinha') cozinha();

  // =====================================================================
  function landing() {
    const items = $('#items');
    const show = i => {
      items.innerHTML = D.menu[i].items.map(it => `
        <li class="dish"><div class="dish-line"><span class="dish-name">${esc(it.name)}</span><span class="dish-dots" aria-hidden="true"></span><span class="dish-price">${eur(it.price)}</span></div>
        ${it.desc || (it.tags || []).length ? `<p class="dish-desc">${esc(it.desc || '')} ${tagHtml(it.tags)}</p>` : ''}</li>`).join('');
    };
    tabs($('#tabs'), show); show(0);

    // QR code to the table-order demo
    const box = $('#qrbox');
    if (box && window.QRCode) {
      const url = new URL('mesa/?mesa=7', location.href).href;
      new QRCode(box, { text: url, width: 180, height: 180, colorDark: '#111111', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }

    // reservation / order forms -> WhatsApp preview (demo never sends)
    document.querySelectorAll('form.form').forEach(f => {
      f.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(f);
        const lines = [f.dataset.title + ' — ' + D.name];
        for (const [k, v] of fd) if (String(v).trim()) lines.push(`${k}: ${v}`);
        const pv = f.querySelector('.preview');
        pv.textContent = lines.join('\n');
        pv.classList.add('show');
        f.querySelector('.preview-cap').hidden = false;
      });
    });
    const d = $('input[type=date]'); if (d) d.min = new Date().toISOString().slice(0, 10);
  }

  // =====================================================================
  function mesa() {
    const params = new URLSearchParams(location.search);
    const table = (params.get('mesa') || '7').replace(/\D/g, '').slice(0, 3) || '7';
    $('#table').textContent = 'Mesa ' + table;
    const cart = new Map(); // key "c-i" -> qty
    const list = $('#list');
    list.innerHTML = D.menu.map((c, ci) => `
      <h2 class="m-cat" id="cat-${ci}">${esc(c.category)}</h2>
      ${c.items.map((it, ii) => `
        <div class="m-item"><div class="txt"><h4>${esc(it.name)} ${tagHtml(it.tags)}</h4>
          ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}<div class="price">${eur(it.price)}</div></div>
          <div class="qty" data-k="${ci}-${ii}"><button class="minus" aria-label="Remover" hidden>−</button><span hidden>0</span><button class="plus" aria-label="Adicionar">+</button></div>
        </div>`).join('')}`).join('');
    tabs($('#tabs'), i => $('#cat-' + i).scrollIntoView({ behavior: 'smooth' }));

    const item = k => { const [c, i] = k.split('-').map(Number); return D.menu[c].items[i]; };
    function render() {
      document.querySelectorAll('.qty').forEach(q => {
        const n = cart.get(q.dataset.k) || 0;
        q.querySelector('span').textContent = n;
        q.querySelector('span').hidden = q.querySelector('.minus').hidden = n === 0;
      });
      let n = 0, sum = 0;
      cart.forEach((q, k) => { n += q; sum += q * item(k).price; });
      const bar = $('#cartbar');
      bar.hidden = n === 0;
      $('#cartn').textContent = n; $('#cartsum').textContent = eur(sum);
      $('#lines').innerHTML = [...cart].map(([k, q]) => `<div class="line-it"><span>${q}× ${esc(item(k).name)}</span><b>${eur(q * item(k).price)}</b></div>`).join('');
      $('#total').textContent = eur(sum);
    }
    list.addEventListener('click', e => {
      const b = e.target.closest('.qty button'); if (!b) return;
      const k = b.parentElement.dataset.k, n = (cart.get(k) || 0) + (b.classList.contains('plus') ? 1 : -1);
      n > 0 ? cart.set(k, n) : cart.delete(k); render();
    });
    const sheet = $('#sheet');
    $('#cartbar').onclick = () => sheet.classList.add('open');
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.classList.remove('open'); });
    $('#send').onclick = () => {
      const order = {
        id: Math.floor(100 + Math.random() * 900), table, at: Date.now(), obs: $('#obs').value.trim(),
        lines: [...cart].map(([k, q]) => ({ q, name: item(k).name, price: item(k).price }))
      };
      try {
        const key = 'orders:' + D.slug, all = JSON.parse(localStorage.getItem(key) || '[]');
        all.unshift(order); localStorage.setItem(key, JSON.stringify(all.slice(0, 30)));
      } catch (_) { /* storage unavailable: the demo still shows the confirmation */ }
      sheet.classList.remove('open');
      $('#menuview').hidden = true; $('#cartbar').hidden = true;
      $('#doneview').hidden = false;
      $('#orderno').textContent = '#' + order.id;
      const steps = document.querySelectorAll('.status div');
      [0, 2500, 6000].forEach((ms, i) => setTimeout(() => steps[i].classList.add('on'), ms));
      window.scrollTo(0, 0);
    };
    $('#again').onclick = () => { cart.clear(); render(); $('#obs').value = ''; $('#doneview').hidden = true; $('#menuview').hidden = false; document.querySelectorAll('.status div').forEach(s => s.classList.remove('on')); };
    render();
  }

  // =====================================================================
  function cozinha() {
    const key = 'orders:' + D.slug;
    const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } };
    const write = a => { try { localStorage.setItem(key, JSON.stringify(a)); } catch (_) {} };
    function render() {
      const all = read();
      $('#tickets').innerHTML = all.length ? all.map((o, i) => `
        <div class="ticket ${o.ready ? 'ready' : ''}">
          <h3><span>Mesa ${esc(o.table)}</span><span>#${o.id}</span></h3>
          <small>${new Date(o.at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</small>
          <ul>${o.lines.map(l => `<li><b>${l.q}×</b> ${esc(l.name)}</li>`).join('')}</ul>
          ${o.obs ? `<div class="obs">📝 ${esc(o.obs)}</div>` : ''}
          <p><button class="btn ${o.ready ? 'btn-secondary' : 'btn-primary'}" data-i="${i}">${o.ready ? 'Servido ✓' : 'Marcar como pronto'}</button></p>
        </div>`).join('')
        : `<div class="empty"><p style="font-size:3rem;margin:0">🧾</p><p>Ainda não há pedidos.<br>Abra a <a href="../mesa/?mesa=4">ementa da mesa</a> neste dispositivo, faça um pedido e ele aparece aqui.</p></div>`;
    }
    $('#tickets').addEventListener('click', e => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      const all = read(); all[b.dataset.i].ready = !all[b.dataset.i].ready; write(all); render();
    });
    window.addEventListener('storage', render);
    setInterval(render, 4000);
    render();
  }
})();
