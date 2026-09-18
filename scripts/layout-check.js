/* Preview-only verification UI. It embeds the exact deployed public shell. */
const frame=document.querySelector('iframe'),status=document.querySelector('#status');
for(const button of document.querySelectorAll('[data-width]'))button.addEventListener('click',()=>{frame.style.width=button.dataset.width+'px';status.textContent='Viewport width: '+button.dataset.width+'px';});
fetch('/index.html').then(r=>{if(!r.ok)throw new Error('Could not load app');return r.text()}).then(html=>{frame.srcdoc=html.replace('<head>','<head><base href="/">');status.textContent='Viewport width: 390px';}).catch(()=>{status.textContent='The deployed app could not be loaded.'});
