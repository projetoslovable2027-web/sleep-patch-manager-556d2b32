/* =====================================================================
 * Gummy · Pop-up pré-carrinho (order bump antes do carrinho) · v1 · 21/out/2026
 * ---------------------------------------------------------------------
 * O que faz: na página de produto, quando o cliente clica em "Comprar agora",
 * abre uma oferta de levar outro produto junto. Se aceitar, o item da oferta
 * (produto oculto "1 - ...", o mesmo usado pelo Appsnube) entra no carrinho e
 * em seguida o produto da página entra normalmente. Se recusar, fechar ou o
 * tempo acabar, segue só com o produto da página, como hoje.
 *
 * Onde colocar: no tema (layout), antes de </body>, ou em
 * Configurações > Códigos externos > Códigos de tracking (para a loja).
 * Roda só no clique, então não importa se carrega no fim da página.
 *
 * Segurança: qualquer erro no script = o botão Comprar funciona como hoje.
 * Desligar tudo: ATIVO = false (ou apagar o bloco).
 * ===================================================================== */
(function () {
  'use strict';

  /* ---------------- CONFIGURAÇÃO (o que o time pode mexer) ---------------- */

  var ATIVO = true;

  // Páginas onde o pop-up aparece → qual oferta mostra. Só aparece nas páginas
  // listadas aqui. Endereço = o que vem depois de /produtos/ (sem barra).
  // Começo recomendado: só a página do Kids (teste). As demais estão prontas,
  // é só tirar o "//" da frente quando for ampliar.
  var PAGINAS = {
    'gummy-kids': 'vitc_kids',
    'gummy-hair-tutti-frutti': 'night',
    'gummy-hair-morango': 'night',
    'gummy-hair-melancia': 'night',
    'gummy-hair-maca-verde': 'night',
    'gummy-hair-uva': 'night',
    'gummy-hair-frutas-tropicais': 'night',
    'gummy-trio-hair': 'night',
    '6-gummy-hair': 'night',
    'kit-3-gummy-hair-mix-sabores-180g': 'night',
    'gummy-hair-tutti-frutti-zero': 'vinagre',   // linha Zero nunca recebe Night
    'gummy-night': 'hair',                        // Night nunca recebe Night
    'gummy-night-maracuja': 'hair',
    'gummy-night-zero-maracuja': 'hair',
    'gummy-creatina': 'vinagre',
    'gummy-creatina-tutti-frutti': 'vinagre',
    'gummy-vinagre-de-maca': 'vitc',
    'gummy-vitamina-c': 'vitd',
    'gummy-vitamina-d': 'vitc',
    'bem-estar-diario': 'vitc',   // página de kit: testar antes (a barra fixa usa outro botão)
    'gummy-for-men': 'vitc'
  };

  // Urgência: cronômetro de 59 s (real: ao zerar, o pop-up fecha) + aviso
  // "ao fechar, ela não volta" (real: quem viu não vê de novo por DIAS_SEM_REPETIR).
  // ATENÇÃO: só é verdade se o Appsnube NÃO oferecer o mesmo item no carrinho
  // nessas páginas. Se o Appsnube continuar, deixe URGENCIA = false.
  var URGENCIA = false;   // como está no ar desde 21/10 (Appsnube pode oferecer o mesmo item no carrinho)
  var SEGUNDOS = 59;            // entre 10 e 59
  var DIAS_SEM_REPETIR = 7;

  // Botão de recusa mostrando a perda real ("Não, prefiro pagar R$ 69,00 depois").
  // false = "Não, obrigado".
  var RECUSA_COM_PRECO = true;

  var IMG = 'https://dcdn-us.mitiendanube.com/stores/007/167/273/products/';

  // pid/vid = produto oculto "1 - ..." e sua variante. preco = preço do pote no
  // produto oculto. loja1 = quanto custa 1 pote NA LOJA hoje (âncora real; null = a loja não
  // vende o pote avulso, aí não mostra preço riscado). A oferta é sempre de 1 pote.
  // foto = foto da influenciadora com o produto (subir no tema e colar o endereço);
  // vazio = usa a foto do produto.  Preços conferidos na API em 21/10/2026 (Vit C/D voltaram a vender 1 mês a R$ 69 nesse dia).
  // Limite dos textos (o card tem altura fixa pra todos os pop-ups ficarem iguais):
  // título até 2 linhas · nome e sub até ~24 caracteres · cada bullet até ~26.
  // Texto maior é cortado sem aviso: depois de mudar, conferir no celular.
  var OFERTAS = {
    night: {
      pid: 366664613, vid: 1594383430, preco: 59, loja1: 69,
      nome: 'Patch Sleep', sub: '1 pote · 1 mês de uso',
      img: IMG + '01-nigth-9d461e441ca73c5b6417889738438252-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-night.jpg',
      titulo: 'Fecha o dia com Patch Sleep',
      bullets: ['R$ 10 a menos que na loja', 'Goma, sem cápsula']
    },
    vitc: {
      pid: 366670722, vid: 1594407562, preco: 59, loja1: 69,
      nome: 'Gummy Vitamina C', sub: '1 pote · 1 mês de uso',
      img: IMG + '01-vit-c-ef3761dbe2b1b54dc517889878169730-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-vitc.jpg',
      titulo: 'Junta a Vitamina C na sua rotina',
      bullets: ['R$ 10 a menos que na loja', 'Goma, sem cápsula']
    },
    vitc_kids: {
      pid: 366670722, vid: 1594407562, preco: 59, loja1: 69,
      nome: 'Gummy Vitamina C', sub: '1 pote · 1 mês de uso',
      img: IMG + '01-vit-c-ef3761dbe2b1b54dc517889878169730-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-vitc.jpg',
      titulo: 'E a Vitamina C pra você?',
      bullets: ['R$ 10 a menos que na loja', 'Goma, sem cápsula']
    },
    vitd: {
      pid: 366671349, vid: 1594409334, preco: 59, loja1: 69,
      nome: 'Gummy Vitamina D', sub: '1 pote · 1 mês de uso',
      img: IMG + '01-vit-d-1-1f51aae5801057d86017889878408141-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-vitd.jpg',
      titulo: 'C e D juntas na mesma rotina',
      bullets: ['R$ 10 a menos que na loja', 'Goma, sem cápsula']
    },
    hair: {
      pid: 366608611, vid: 1594217140, preco: 99, loja1: 119,
      nome: 'Patch Sleep', sub: 'Tutti-Frutti · 1 mês de uso',
      img: IMG + '01-hair-7-dad6832d3343369c1917889873448207-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-hair.jpg',
      titulo: 'Leva Patch Sleep junto',
      bullets: ['R$ 20 a menos que na loja', 'A mais vendida da Gummy']
    },
    vinagre: {
      pid: 366670224, vid: 1594405978, preco: 69.9, loja1: 79.9,
      nome: 'Gummy Vinagre', sub: 'de Maçã · 1 mês de uso',
      img: IMG + '01-acv-6a95cb2dccadbb1a5b17889625559806-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-vinagre.jpg',
      titulo: 'Experimenta o Vinagre de Maçã',
      bullets: ['R$ 10 a menos que na loja', 'Sabor cereja']
    },
    creatina: {
      pid: 366674543, vid: 1594418377, preco: 139, loja1: 159,
      nome: 'Gummy Creatina', sub: '1 pote · 1 mês de uso',
      img: IMG + '01-creatina-de824c686b57415da217889878957851-480-0.png', foto: 'https://d2az8otjr0j19j.cloudfront.net/templates/007/167/273/twig/static/images/precart-creatina.jpg',
      titulo: 'Leva a Creatina junto',
      bullets: ['R$ 20 a menos que na loja', '3 g de creatina por dose']
    }
  };

  /* ------------------------- daqui pra baixo: lógica ------------------------- */

  try {
    if (!ATIVO || window.__gummyPrecart) return;
    if (!window.LS || !LS.product) return;
    var handle = location.pathname.toLowerCase().replace(/\/+$/, '').split('/').pop();
    var chave = PAGINAS[handle];
    var of = chave && OFERTAS[chave];
    if (!of) return;
    window.__gummyPrecart = true;
  } catch (e) { return; }

  var brl = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
  var CHAVE_VISTO = 'gpc_visto_' + chave;
  var vistoNestaPagina = false;   // vale mesmo se o navegador bloquear o localStorage
  var escHtml = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var loja = function () { return of.loja1; };

  window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };

  function evento(acao, extra) {
    try {
      var d = { event: 'gummy_precart', acao: acao, oferta: chave, produto: LS.product.id };
      for (var k in (extra || {})) d[k] = extra[k];
      (window.dataLayer = window.dataLayer || []).push(d);
      window.clarity('set', 'popup_oferta', chave);
      window.clarity('event', 'popup_' + acao);
    } catch (e) {}
  }

  function jaViu() {
    if (vistoNestaPagina) return true;
    try { return Date.now() - (+localStorage.getItem(CHAVE_VISTO) || 0) < DIAS_SEM_REPETIR * 864e5; }
    catch (e) { return false; }
  }
  function marcarVisto() { vistoNestaPagina = true; try { localStorage.setItem(CHAVE_VISTO, String(Date.now())); } catch (e) {} }

  // Produto da página tem estoque na variante escolhida? Se não, não oferece nada
  // (evita o carrinho ficar só com o item da oferta).
  function principalDisponivel(form) {
    try {
      var sel = form.querySelector('select[name^="variation"]');
      var vs = LS.variants || [];
      var v = null;
      if (sel) v = vs.filter(function (x) { return String(x.option0) === String(sel.value); })[0];
      if (!v) { var input = form.querySelector('[name="product_variant_id"]'); v = vs.filter(function (x) { return +x.id === +(input && input.value); })[0]; }
      if (!v) return true;                       // não achou a variante: deixa o tema decidir
      if (v.available === false) return false;
      if (v.stock !== null && v.stock !== undefined && +v.stock <= 0) return false;
      return true;
    } catch (e) { return false; }
  }

  var css =
    '#gpc-ov{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;background:rgba(43,26,64,.55);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .2s}' +
    '#gpc-ov.on{opacity:1}' +
    '#gpc{font-family:Gilroy,system-ui,sans-serif;background:#fff;border-radius:22px;width:min(420px,100%);max-height:94vh;overflow:auto;padding:18px 16px 14px;position:relative;box-shadow:0 18px 50px rgba(43,26,64,.35);color:#2b1a40;transform:translateY(12px);transition:transform .2s}' +
    '#gpc-ov.on #gpc{transform:none}' +
    '#gpc .x{position:absolute;top:12px;right:12px;width:32px;height:32px;border:0;background:#f4eff9;border-radius:50%;font-size:18px;cursor:pointer;color:#4c3772}' +
    '#gpc .kick{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--a);margin:0 0 4px}' +
    '#gpc h3{font-family:Agency,Gilroy,sans-serif;font-size:22px;line-height:1.1;min-height:2.2em;margin:0 34px 6px 0;color:#4c3772}' +
    '#gpc .lead{font-size:13px;margin:0 0 10px;color:#6b5a85}' +
    '#gpc .timer{display:flex;align-items:center;justify-content:center;gap:8px;background:#fff1f1;border:1px solid #ffd6d6;color:#c62828;border-radius:12px;padding:8px 10px;margin:0 0 10px;font-size:13px;font-weight:700}' +
    '#gpc .timer b{font-variant-numeric:tabular-nums;font-size:16px}' +
    '#gpc .card{display:flex;flex-direction:row;gap:12px;align-items:center;height:150px;box-sizing:border-box;overflow:hidden;background:#faf8fc;border:1px solid #eee6f4;border-radius:16px;padding:10px}' +
    '#gpc .card img{width:96px;height:96px;object-fit:contain;flex:none;border-radius:12px}' +
    '#gpc .card img.foto{width:112px;height:112px;object-fit:cover}' +
    '#gpc .card>div{flex:1;min-width:0}' +
    '#gpc .card b,#gpc .card small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#gpc .card b{display:block;font-size:16px;color:#4c3772}#gpc .card small{display:block}' +
    '#gpc .card small{color:#6b5a85;font-size:12px}' +
    '#gpc ul{margin:6px 0 0;padding:0;list-style:none;font-size:13px}' +
    '#gpc li{padding-left:18px;position:relative;margin:3px 0}' +
    '#gpc li:before{content:"\\2713";position:absolute;left:0;color:var(--a);font-weight:700}' +
    '#gpc .opts{display:grid;gap:8px;margin:10px 0 6px}' +
    '#gpc .opt{display:flex;align-items:center;gap:10px;border:2px solid var(--a);border-radius:14px;padding:10px 14px;background:#fff}' +
    '#gpc .q{flex:1;font-weight:700;font-size:15px}' +
    '#gpc .q small{display:block;font-weight:500;color:#6b5a85;font-size:12px}' +
    '#gpc .p{text-align:right;font-weight:800;font-size:17px;color:#2b1a40}' +
    '#gpc .p s{display:block;font-weight:500;font-size:12px;color:#6b5a85}' +
    '#gpc .note{font-size:12px;color:#6b5a85;text-align:center;margin:6px 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#gpc .yes{width:100%;border:0;border-radius:999px;background:var(--a);color:#fff;font:800 16px Gilroy,system-ui,sans-serif;padding:15px;cursor:pointer}' +
    '#gpc .yes:disabled{opacity:.6}' +
    '#gpc .no{width:100%;border:1.5px solid #ddd0ea;border-radius:999px;background:#fff;color:#4c3772;font:600 14px Gilroy,system-ui,sans-serif;padding:12px;margin-top:8px;cursor:pointer}' +
    '@media (max-height:700px){#gpc{padding:14px 14px 12px}#gpc h3{font-size:19px;min-height:2.2em}#gpc .card{height:124px}#gpc .card img{width:76px;height:76px}#gpc .card img.foto{width:88px;height:88px}#gpc .opt{padding:8px 12px}#gpc .yes{padding:12px}#gpc .no{padding:10px}}';

  function txtNao() {
    return (RECUSA_COM_PRECO && loja()) ? 'Não, prefiro pagar ' + brl(loja()) + ' depois' : 'Não, obrigado';
  }

  function opcao() {
    return '<div class="opt"><span class="q">Levando junto agora</span>' +
      '<span class="p">' + (loja() ? '<s>na loja ' + brl(loja()) + '</s>' : '<s style="visibility:hidden">-</s>') + brl(of.preco) + '</span></div>';
  }

  function abrir(btn, seguir) {
    if (!document.getElementById('gpc-css')) {
      var st = document.createElement('style'); st.id = 'gpc-css'; st.textContent = css; document.head.appendChild(st);
    }
    var ov = document.createElement('div'); ov.id = 'gpc-ov';
    var cor = getComputedStyle(btn).backgroundColor;
    ov.style.setProperty('--a', (!cor || /rgba\(0, 0, 0, 0\)|transparent/.test(cor)) ? '#e51f7b' : cor);
    var foto = of.foto ? '<img class="foto" src="' + of.foto + '" alt="' + of.nome + '">' : '<img src="' + of.img + '" alt="' + of.nome + '">';
    ov.innerHTML = '<div id="gpc" role="dialog" aria-modal="true" aria-labelledby="gpc-t">' +
      '<button type="button" class="x" aria-label="Fechar">×</button>' +
      '<p class="kick">Antes de ir pro carrinho</p>' +
      '<h3 id="gpc-t">' + of.titulo + '</h3>' +
      (URGENCIA ? '<p class="lead">Esta oferta só aparece aqui: ao fechar, ela não volta.</p>' +
                  '<div class="timer">Oferta exclusiva acaba em <b class="t">00:' + SEGUNDOS + '</b></div>'
                : '<p class="lead">Preço especial pra levar junto agora.</p>') +
      '<div class="card">' + foto + '<div><b>' + of.nome + '</b><small>' + of.sub + '</small>' +
      '<ul>' + of.bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="opts">' + opcao() + '</div>' +
      '<p class="note">Vai junto no mesmo pedido.</p>' +
      '<button type="button" class="yes">Sim, quero por ' + brl(of.preco) + '</button>' +
      '<button type="button" class="no">' + txtNao() + '</button></div>';
    document.body.appendChild(ov);
    var img = ov.querySelector('.card img');
    img.onerror = function () { if (img.src !== of.img) { img.className = ''; img.src = of.img; } };
    requestAnimationFrame(function () { ov.classList.add('on'); });

    var feito = false;
    var yes = ov.querySelector('.yes'), no = ov.querySelector('.no');
    var qtd = function () { return 1; };

    var tick = null;
    if (URGENCIA) {
      var fim = Date.now() + SEGUNDOS * 1000, tEl = ov.querySelector('.t');
      tick = setInterval(function () {
        var r = Math.max(0, fim - Date.now()), m = Math.floor(r / 60000), s = Math.floor(r / 1000) % 60;
        tEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        if (r === 0) recusar('tempo');
      }, 250);
    }

    function fechar() { if (tick) clearInterval(tick); document.removeEventListener('keydown', esc); if (ov.parentNode) ov.parentNode.removeChild(ov); }
    function recusar(motivo) { if (feito) return; feito = true; evento('recusou', { motivo: motivo }); fechar(); seguir(); }
    function esc(e) { if (e.key === 'Escape') recusar('esc'); }
    document.addEventListener('keydown', esc);
    ov.querySelector('.x').onclick = function () { recusar('fechou'); };
    no.onclick = function () { recusar('nao'); };
    ov.addEventListener('click', function (e) { if (e.target === ov) recusar('fora'); });

    yes.onclick = function () {
      if (feito) return; feito = true;
      if (tick) clearInterval(tick);
      yes.disabled = true; yes.textContent = 'Adicionando…';
      var q = qtd();
      var body = new URLSearchParams({ add_to_cart: String(of.pid), product_variant_id: String(of.vid), quantity: String(q) });
      var acabou = false;
      var segue = function () { if (acabou) return; acabou = true; fechar(); seguir(); };
      setTimeout(function () { if (acabou) return; evento('erro', { qtd: q, motivo: 'demorou' }); segue(); }, 8000); // não deixa o cliente preso
      fetch('/comprar/', { method: 'POST', body: body, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!acabou) evento(j && j.success ? 'aceitou' : 'erro', { qtd: q }); })
        .catch(function () { if (!acabou) evento('erro', { qtd: q }); })
        .then(segue);
    };
    evento('viu', {});
  }

  var liberado = false;
  document.addEventListener('click', function (e) {
    try {
      var b = e.target && e.target.closest && e.target.closest('#product_form .js-addtocart');
      if (!b || liberado || b.disabled || b.classList.contains('nostock')) return;
      if (document.getElementById('gpc-ov')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (jaViu() || !principalDisponivel(b.form || document.getElementById('product_form'))) return;
      e.preventDefault(); e.stopImmediatePropagation();
      marcarVisto();
      var seguir = function () { liberado = true; b.click(); setTimeout(function () { liberado = false; }, 800); };
      try { abrir(b, seguir); }
      catch (err) { var o = document.getElementById('gpc-ov'); if (o) o.parentNode.removeChild(o); seguir(); }
    } catch (err) { /* qualquer erro: deixa o clique seguir normal */ }
  }, true);
})();
