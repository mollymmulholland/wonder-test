/* Spatial discovery is presentation, never an additional psychological signal. */
window.WonderSanctuary = function (ctx) {
  'use strict';
  const { state, esc, mount, go, journey, api, toast, error, arrow } = ctx;
  const chapters = [
    { id: 'Earth', place: 'The ground', title: 'What holds you.', line: 'Before we ask where you are going, we begin with what you stand on.', invitation: 'Explore the values, ordinary choices, and foundations you return to.', question: 'What in your life feels worth protecting?', symbol: 'M12 3 2 21h20L12 3Zm-6 12h12' },
    { id: 'Water', place: 'The crossing', title: 'How you come close.', line: 'There are things we feel before we find language for them.', invitation: 'Notice trust, independence, tenderness, and what helps closeness feel possible.', question: 'When does closeness feel easy for you?', symbol: 'M12 2C10 7 4 10 4 15a8 8 0 0 0 16 0c0-5-6-8-8-13Z' },
    { id: 'Fire', place: 'The clearing', title: 'What brings you alive.', line: 'Some things ask for your attention. Others awaken it.', invitation: 'Explore desire, momentum, attraction, and the choices you make under pressure.', question: 'What do you move toward without being asked?', symbol: 'M13 2c2 7-5 7-3 12 2-1 3-2 4-5 6 6 7 13-2 13C1 22 2 13 8 8c-1 4 0 5 1 6-1-5 4-7 4-12Z' },
    { id: 'Air', place: 'The horizon', title: 'The shape of your thinking.', line: 'A new perspective can make a familiar landscape feel different.', invitation: 'Explore curiosity, ambiguity, decisions, and the way you make sense of things.', question: 'What makes you reconsider something you believed?', symbol: 'M2 8h14a3 3 0 1 0-3-3M2 12h18a3 3 0 1 1-3 3M2 16h7a3 3 0 1 1-3 3' },
    { id: 'Ether', place: 'The inner room', title: 'What remains. What becomes.', line: 'You are more than the life you have already lived.', invitation: 'Consider meaning, identity, and what is changing in this chapter of your life.', question: 'What are you learning to ask for more honestly?', symbol: 'M12 2 22 12 12 22 2 12 12 2Zm0 5 5 5-5 5-5-5 5-5Z' }
  ];
  let selectedChapter = null;
  const symbol = c => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="${c.symbol}"/></svg>`;
  const action = (label, value, cls = '', extra = '') => `<button class="btn ${cls}" type="button" data-sanctuary="${value}" ${extra}>${label}</button>`;
  const getChapter = id => chapters.find(c => c.id === id) || chapters[4];
  function map(current = 'Earth', entered = []) {
    return `<div class="labyrinth" aria-hidden="true"><svg viewBox="0 0 500 500" fill="none"><g class="labyrinth-lines" stroke="currentColor" stroke-width=".85"><path d="M250 463V420A170 170 0 1 1 420 250V390H385V250A135 135 0 1 0 250 385V350A100 100 0 1 1 350 250V320H315V250A65 65 0 1 0 250 315V280A30 30 0 1 1 280 250"/><path d="M285 462V455A207 207 0 1 0 43 250V357M78 393V250A172 172 0 0 1 250 78"/><circle cx="250" cy="250" r="8"/></g><circle class="map-marker" cx="${{Earth:250,Water:87,Fire:250,Air:413,Ether:250}[current]}" cy="${{Earth:448,Water:250,Fire:87,Air:250,Ether:250}[current]}" r="5" fill="currentColor"/></svg><span class="labyrinth-center">${symbol(getChapter(current))}</span></div>`;
  }
  function welcome() {
    mount(`<section class="sanctuary-welcome scene-Earth"><div class="sanctuary-landscape"></div><div class="sanctuary-grain"></div><div class="threshold-copy"><p class="eyebrow">WONDER / A journey inward</p><h1>There’s no greater intimacy<br>than being <em>understood.</em></h1><p class="threshold-intro">Begin with yourself.<br>Leave room for who you might meet.</p><div class="actions">${action('Enter WONDER '+arrow,'enter','light')}${action('How the journey works','how','ghost-light')}</div><p class="threshold-foot">Five elements. Your own pace. A clearer view.</p></div><div class="threshold-mark">${map()}</div></section>`);
  }
  async function threshold() {
    await journey.load();
    const own = journey.current();
    mount(`<section class="sanctuary-threshold scene-Earth"><div class="sanctuary-landscape"></div><div class="threshold-copy"><p class="eyebrow">Your beginning / ${esc(own.basics.name || state.user?.user_metadata?.chosen_name || 'Welcome')}</p><h1>Come as you are.<br><em>Meet what is there.</em></h1><p class="threshold-intro">This is a space to notice your own patterns, find language for them, and change what does not fit.</p><div class="threshold-principles"><p><span>01</span> Explore five elements of your life.</p><p><span>02</span> Receive a private Mirror you can correct.</p><p><span>03</span> Choose when to make room for another.</p></div><div class="actions">${action('Open my path '+arrow,'open-path','light')}${action('Privacy, before we begin','privacy','ghost-light')}</div><p class="small">There is no ideal answer. You can stop and return.</p></div><div class="threshold-mark">${map()}</div></section>`);
  }
  async function atlas() {
    await journey.load();
    const own = journey.current(), responses = state.assessment?.responses || {};
    const q = await api('/api/assessment/next', { responses });
    const current = q.complete ? 'Ether' : q.element;
    selectedChapter = selectedChapter || current;
    const focus = getChapter(selectedChapter), done = own.discovery?.entered || [];
    mount(`<section class="path-room scene-${focus.id}"><div class="path-header"><p class="eyebrow">The path / Elemental resonance</p><h1>There is more<br><em>to discover.</em></h1><p>Each element offers a different way in. Explore the map, then continue from your saved place.</p></div><div class="path-layout"><div class="path-drawing">${map(current, done)}<p class="eyebrow">${Object.keys(responses).length} answers saved${q.complete?' / Ready to review':''}</p></div><div class="path-chapters" role="group" aria-label="Explore the five elements">${chapters.map((c,i)=>`<button type="button" class="path-chapter ${c.id===selectedChapter?'selected':''}" data-sanctuary="inspect" data-element="${c.id}" aria-pressed="${c.id===selectedChapter}"><span class="path-number">0${i+1}</span>${symbol(c)}<span><strong>${c.id}</strong><small>${c.place}</small></span><span class="path-state">${c.id===current?'Your next step':done.includes(c.id)?'Visited':'Explore'}</span></button>`).join('')}</div><aside class="path-insight"><p class="eyebrow">${focus.id} / ${focus.place}</p><h2>${focus.title}</h2><p>${focus.invitation}</p><blockquote>${focus.question}</blockquote><div class="actions">${action(q.complete?'Review my answers':'Continue my path '+arrow,'continue')}${Object.keys(responses).length?action('Review saved answers','review','secondary'):''}${action('Leave for now','home','secondary')}</div><p class="small muted">Your route follows the existing assessment. Exploring the map does not change your answers.</p></aside></div></section>`);
  }
  function chamber(q) {
    const c = getChapter(q.element);
    mount(`<section class="element-gate scene-${c.id}"><div class="sanctuary-landscape"></div><div class="gate-symbol">${symbol(c)}</div><div class="gate-copy"><p class="eyebrow">0${chapters.indexOf(c)+1} / ${c.id} / ${c.place}</p><h1>${c.title.replace(/\.$/,'')}.<br><em>${c.id==='Earth'?'Begin beneath the surface.':c.id==='Water'?'Let there be room.':c.id==='Fire'?'Follow what matters.':c.id==='Air'?'Look again.':'Remain unfinished.'}</em></h1><p>${c.line}</p><p class="small">${c.invitation}</p><div class="actions">${action('Enter '+c.id+' '+arrow,'enter-chapter','light',`data-element="${c.id}"`)}${action('See my path','atlas','ghost-light')}</div><p class="small gate-note">No clock. No score to chase. Your experience is the point.</p></div></section>`);
  }
  async function beforeQuestion(q) {
    await journey.load();
    if (!(journey.current().discovery?.entered || []).includes(q.element) && !q.precision) { chamber(q); return false; }
    return true;
  }
  function questionShell(q, content) {
    const c = getChapter(q.element);
    return `<div class="quest scene-${c.id}"><aside class="quest-landscape"><div class="sanctuary-landscape"></div><div class="quest-place"><p class="eyebrow">0${chapters.indexOf(c)+1} / ${c.place}</p>${symbol(c)}<h2>${c.id}</h2><p>${c.line}</p></div><div class="quest-map-link">${action('Your path','atlas','ghost-light')}<span class="small">Progress stays with you.</span></div></aside><section class="quest-content"><div class="quest-top"><p class="eyebrow">${q.precision?'Putting the details in focus':c.title}</p>${action('Pause','atlas','text-btn')}</div><div class="quest-waypoints" aria-label="Journey through five elements">${chapters.map(x=>`<span class="${x.id===q.element?'current':''}">${symbol(x)}<span>${x.id}</span></span>`).join('')}</div>${content}</section></div>`;
  }
  async function revealed() {
    await journey.load();
    const r=state.report;
    if(!r)return go('assessment');
    mount(`<section class="mirror-arrival"><div class="mirror-arrival-water"></div><div class="mirror-arrival-copy"><p class="eyebrow">Your first Mirror / A beginning, never a verdict</p><p class="arrival-name">${esc(journey.current().basics.name||state.name)},</p><h1>A little closer<br><em>to yourself.</em></h1><p class="arrival-lens">${r.lens_status==='unassigned'?'A portrait beyond a single archetype':'The '+esc(r.name)}</p><p>${esc(r.essence||r.opening)}</p><div class="actions">${action('Meet my Mirror '+arrow,'report','light')}${action('Return to my path','atlas','ghost-light')}</div><p class="small">Read it with curiosity. Keep what fits. Correct what does not.</p></div></section>`);
  }
  async function act(value, button) {
    if(value==='enter')return ctx.createAccount();
    if(value==='how')return go('how');
    if(value==='open-path'){await journey.change('discovery',{welcomeSeen:true});return go('atlas');}
    if(value==='inspect'){selectedChapter=button.dataset.element;return atlas();}
    if(value==='enter-chapter'){await journey.change('discovery',{element:button.dataset.element});return ctx.resumeQuestion();}
    if(value==='review')return ctx.reviewAnswers();
    if(value==='continue')return go('assessment');
    if(value==='privacy'){return ctx.showPrivacy();}
    return go(value);
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-sanctuary]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();b.disabled=true;act(b.dataset.sanctuary,b).catch(x=>error(x.message)).finally(()=>b.disabled=false);},true);
  return {welcome,threshold,atlas,beforeQuestion,questionShell,revealed,chapters,handles:s=>['threshold','atlas','reveal'].includes(s),render:s=>s==='threshold'?threshold():s==='atlas'?atlas():revealed()};
};
