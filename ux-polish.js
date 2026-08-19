(()=>{
  const $=id=>document.getElementById(id);

  function cleanCopy(){
    const account=$('account');
    if(account){
      const h2=account.querySelector('h2'); if(h2)h2.style.display='none';
      const p=account.querySelector(':scope .panel > p.muted'); if(p)p.style.display='none';
      const status=$('accountStatus');
      if(status && /securely stored|saved on this device|authenticated backend/i.test(status.textContent||'')){status.textContent='';status.style.display='none';}
      if(status){new MutationObserver(()=>{const text=(status.textContent||'').trim();status.style.display=text?'block':'none'}).observe(status,{childList:true,subtree:true,characterData:true});}
    }
    const birth=$('birth'); if(birth){const p=birth.querySelector(':scope .panel > p.muted');if(p)p.remove();}
    const essentials=$('essentials'); if(essentials){const p=essentials.querySelector(':scope .panel > p.muted');if(p)p.remove();}
  }

  const css=`
  .wonder-place-wrap{position:relative}
  .wonder-place-menu{position:absolute;z-index:50;left:0;right:0;top:100%;background:#f5f0e7;border:1px solid rgba(25,24,21,.18);box-shadow:0 12px 32px rgba(0,0,0,.09);max-height:270px;overflow:auto;display:none}
  .wonder-place-menu.open{display:block}
  .wonder-place-option{display:block;width:100%;padding:14px 12px;border:0;border-bottom:1px solid rgba(25,24,21,.1);background:transparent;text-align:left;font:inherit;color:inherit}
  .wonder-place-option:last-child{border-bottom:0}
  .wonder-place-option:active{background:rgba(25,24,21,.06)}
  .wonder-place-credit{font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;padding:8px 12px}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  function readMeta(){try{return JSON.parse(localStorage.getItem('wonder_place_meta')||'{}')}catch{return{}}}
  function saveMeta(key,place){const m=readMeta();m[key]=place;localStorage.setItem('wonder_place_meta',JSON.stringify(m));}

  function attach(input,key){
    if(!input||input.dataset.placeReady)return; input.dataset.placeReady='1';input.autocomplete='off';
    const wrap=document.createElement('div');wrap.className='wonder-place-wrap';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const menu=document.createElement('div');menu.className='wonder-place-menu';wrap.appendChild(menu);
    let timer=null,controller=null;
    const close=()=>menu.classList.remove('open');
    async function search(){
      const q=input.value.trim();if(q.length<2){close();return}
      if(controller)controller.abort();controller=new AbortController();
      try{
        const r=await fetch('/api/places?q='+encodeURIComponent(q),{signal:controller.signal});const d=await r.json();
        if(!Array.isArray(d.places)||!d.places.length){close();return}
        menu.innerHTML=d.places.map((p,i)=>`<button type="button" class="wonder-place-option" data-i="${i}">${p.label}</button>`).join('')+'<div class="wonder-place-credit">Place data © OpenStreetMap contributors</div>';
        menu.querySelectorAll('.wonder-place-option').forEach(btn=>btn.onclick=()=>{const p=d.places[Number(btn.dataset.i)];input.value=p.label;input.dataset.placeSelected='1';saveMeta(key,p);input.dispatchEvent(new Event('change',{bubbles:true}));close()});
        menu.classList.add('open');
      }catch(e){if(e.name!=='AbortError')close()}
    }
    input.addEventListener('input',()=>{input.dataset.placeSelected='';clearTimeout(timer);timer=setTimeout(search,320)});
    input.addEventListener('focus',()=>{if(input.value.trim().length>=2){clearTimeout(timer);timer=setTimeout(search,150)}});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
  }

  function boot(){cleanCopy();attach($('pob'),'birthplace');attach($('currentCity'),'current_city');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();