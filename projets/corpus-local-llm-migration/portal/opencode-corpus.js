/* Adaptateur de navigation local ; aucune lecture de stockage navigateur. */
(()=>{
 'use strict';
 const home='/corpus/index.html';
 const navigateHome=()=>{if(window.parent!==window)window.parent.postMessage({type:'corpus-home'},location.origin);else location.assign(home);};
 const returnHome=()=>{if(location.pathname==='/')navigateHome();};
 for(const method of ['pushState','replaceState']){
  const original=history[method];
  history[method]=function(...args){if(args[2]&&window.parent!==window){const url=new URL(args[2],location.origin);if(url.origin===location.origin){url.searchParams.set('corpus_embed','1');args[2]=url.pathname+url.search+url.hash;}}const result=original.apply(this,args);queueMicrotask(returnHome);return result;};
 }
 addEventListener('popstate',returnHome);
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href="/"]');
  if(link){event.preventDefault();event.stopImmediatePropagation();navigateHome();}
 },true);
 function mount(){
  if(document.getElementById('corpus-return'))return;
  const link=document.createElement('a');link.id='corpus-return';link.href=home;
  link.textContent='← Accueil Corpus';link.setAttribute('aria-label','Revenir à l’accueil Corpus');
  link.style.cssText='position:fixed;bottom:12px;left:12px;z-index:9999;background:#1d2320;color:#e6e7df;border:1px solid #a77974;border-radius:8px;padding:9px 14px;font:14px system-ui;text-decoration:none';
  link.addEventListener('click',event=>{event.preventDefault();navigateHome();});
  if(window.parent===window)document.body.append(link);returnHome();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
