(()=>{
const elementByScreen={welcome:'air',account:'earth',birth:'earth',essentials:'earth',visual:'air',assessment:'water',processing:'water',mirror:'water',home:'air',profile:'earth',journal:'earth',ai:'water',matches:'fire'};
document.querySelectorAll('.screen').forEach(s=>s.dataset.element=elementByScreen[s.id]||'earth');

function installOpening(){
 const welcome=document.getElementById('welcome'),hero=welcome?.querySelector('.hero-card');if(!welcome||!hero||welcome.dataset.openingInstalled)return;
 welcome.dataset.openingInstalled='true';
 const originalEnter=hero.querySelector('[data-next="account"]'),originalResume=hero.querySelector('#resumeBtn');
 hero.innerHTML=`<div class="wonder-intro"><div class="intro-copy"><div class="eyebrow">WONDER</div><h1>Dating should start with understanding you.</h1><p class="lede">Tell us how you think, what matters to you, and how you relate to other people. Wonder uses that information to make more compatible introductions.</p><div class="intro-actions"></div></div><div class="intro-visual" aria-hidden="true"><span class="visual-core"></span><span class="visual-ring ring-a"></span><span class="visual-ring ring-b"></span></div></div>`;
 const actions=hero.querySelector('.intro-actions');
 if(originalEnter){originalEnter.className='primary intro-enter';originalEnter.textContent='Get started';actions.appendChild(originalEnter)}
 if(originalResume){originalResume.className='ghost intro-resume';originalResume.textContent='Resume';actions.appendChild(originalResume)}
}
installOpening();

const originalShow=window.show;if(typeof originalShow==='function'){let transitioning=false;window.show=function(id){const current=document.querySelector('.screen.active');if(!current||current.id===id||transitioning)return originalShow(id);transitioning=true;const next=document.getElementById(id);current.classList.add('wonder-leaving');setTimeout(()=>{originalShow(id);current.classList.remove('wonder-leaving');if(next){next.classList.add('wonder-entering');setTimeout(()=>next.classList.remove('wonder-entering'),420)}transitioning=false},220)}}

function decorateQuestion(){const mount=document.getElementById('questionMount');if(!mount)return;const scale=mount.querySelector('.scale-options');if(scale){const selected=scale.querySelector('.scale-option.selected');const v=selected?Number(selected.dataset.v):0;scale.style.setProperty('--scale-fill',v?`${((v-1)/6)*100}%`:'0%')}}
function installQuestionPassage(){const next=document.getElementById('nextQuestion'),prev=document.getElementById('prevQuestion'),mount=document.getElementById('questionMount');if(!next||!mount)return;const oldNext=next.onclick;if(typeof oldNext==='function'){next.onclick=null;next.addEventListener('click',e=>{if(next.disabled)return;e.preventDefault();mount.classList.add('question-depart');setTimeout(()=>{mount.classList.remove('question-depart');oldNext.call(next,e)},140)})}if(prev&&typeof prev.onclick==='function'){const oldPrev=prev.onclick;prev.onclick=null;prev.addEventListener('click',e=>{e.preventDefault();mount.classList.add('question-reverse');setTimeout(()=>{mount.classList.remove('question-reverse');oldPrev.call(prev,e)},140)})}}
setTimeout(installQuestionPassage,0);

function installMirror(){
 const mirror=document.getElementById('mirror'),existing=mirror?.querySelector('.mirror');if(!mirror||!existing||mirror.dataset.cleanMirror)return;mirror.dataset.cleanMirror='true';
 const eyebrow=existing.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='YOUR MIRROR';
 const note=existing.querySelector('#archetypeNote');if(note)note.insertAdjacentHTML('afterend','<p class="mirror-intro">A working profile based on your responses. It is meant to become more accurate as Wonder learns from your choices and feedback.</p>');
 const labels=['How you think','What matters to you','How you relate','Where you may be conflicted'];existing.querySelectorAll('.mirror-grid article').forEach((article,i)=>{const span=article.querySelector('span');if(span)span.textContent=labels[i]||span.textContent});
 const uncertain=existing.querySelector('.uncertain span');if(uncertain)uncertain.textContent='What Wonder is less certain about';
 const accuracy=existing.querySelector('.accuracy h2');if(accuracy)accuracy.textContent='How accurate is this?';
}
installMirror();

const mount=document.getElementById('questionMount');if(mount){new MutationObserver(()=>{decorateQuestion();mount.classList.add('question-arrive');setTimeout(()=>mount.classList.remove('question-arrive'),360)}).observe(mount,{childList:true,subtree:true})}
})();