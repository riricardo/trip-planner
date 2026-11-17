const daysContainer = document.querySelector('#days');
const errorMessage = document.querySelector('#error');
const dayTemplate = document.querySelector('#day-template');
const stopTemplate = document.querySelector('#stop-template');

let userInteracted = false;
['wheel','touchstart','keydown','pointerdown'].forEach(type => window.addEventListener(type, () => {userInteracted = true;}, {once:true, passive:true}));
async function loadItinerary() {
  try {
    const response = await fetch('./data.json', {cache:'no-store'});
    if (!response.ok) throw new Error(`Erro ao carregar data.json (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data.days)) throw new Error('Lista de dias inválida');
    document.querySelector('#trip-title').textContent = data.title || 'Meu roteiro';
    document.querySelector('#trip-subtitle').textContent = data.subtitle || '';
    daysContainer.replaceChildren(...data.days.map(renderDay));
    requestAnimationFrame(() => {
      const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
      const key=`${v.day} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][Number(v.month)-1]}`;
      if(userInteracted)return;
      const idx=data.days.findIndex(d=>d.date===key);
      if(idx<0)return;
      const card=daysContainer.querySelectorAll('.day-card')[idx];
      const stops=data.days[idx].stops||[];
      const now=Number(v.hour)*60+Number(v.minute);
      let active=0;
      for(let i=0;i<stops.length;i++){const m=/^(\d{1,2}):(\d{2})/.exec(stops[i].arrival||'');if(m&&Number(m[1])*60+Number(m[2])<=now)active=i;}
      const target=card.querySelectorAll('.stop')[active]||card;
      target.scrollIntoView({block:'start',behavior:'instant'});
    });
  } catch (error) {
    console.error(error);
    errorMessage.textContent = 'Não foi possível carregar o roteiro. Confira se data.json está ao lado do index.html e abra o site por um servidor local.';
    errorMessage.hidden = false;
  }
}
function renderDay(day) {
  const fragment = dayTemplate.content.cloneNode(true);
  fragment.querySelector('.day-date').textContent = day.date || '';
  fragment.querySelector('.day-title').textContent = day.title || 'Dia sem título';
  const note = fragment.querySelector('.day-note');
  note.textContent = day.note || '';
  note.hidden = !day.note;
  const container = fragment.querySelector('.stops');
  const stops = Array.isArray(day.stops) ? day.stops : [];
  stops.forEach((stop, index) => {
    container.append(renderStop(stop));
    if (index < stops.length - 1 && stop.routeToNext) container.append(renderRoute(stop.routeToNext, stop.name, stops[index+1].name, stops[index], stops[index+1]));
  });
  const button = day.hideDayRoute ? null : renderDayRoute(stops, day.date);
  if (button) container.append(button);
  return fragment;
}
function getStopAddress(stop) {return typeof stop.address === 'string' ? stop.address.trim() : '';}
function getStopMapQuery(stop) {return getStopAddress(stop) || (typeof stop.name === 'string' ? stop.name.trim() : '');}
function buildDayRouteUrl(stops) {
  const points = stops.filter(s=>s.includeInMapRoute !== false).map(getStopMapQuery).filter(Boolean);
  if (points.length < 2 || points.length > 10) return '';
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api','1');url.searchParams.set('origin',points[0]);url.searchParams.set('destination',points.at(-1));url.searchParams.set('travelmode','driving');
  if (points.length>2) url.searchParams.set('waypoints',points.slice(1,-1).join('|'));
  return url.toString();
}
function renderDayRoute(stops,date) {
  const url=buildDayRouteUrl(stops);if(!url)return null;
  const a=document.createElement('a');a.className='day-route-button';a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  a.setAttribute('aria-label',`Abrir rota completa de ${date || 'este dia'} no Google Maps`);
  a.append('Rota completa no Google Maps ');const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');a.append(arrow);return a;
}
function routePointsUrl(points){
  if(!Array.isArray(points)||points.length<2)return '';
  const url=new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api','1');url.searchParams.set('origin',points[0]);url.searchParams.set('destination',points.at(-1));
  url.searchParams.set('travelmode','driving');
  if(points.length>2)url.searchParams.set('waypoints',points.slice(1,-1).join('|'));
  return url.toString();
}
function mapLink(address) {const url=new URL('https://www.google.com/maps/search/');url.searchParams.set('api','1');url.searchParams.set('query',address);return url.toString();}
function imageLink(query) {const url=new URL('https://www.google.com/search');url.searchParams.set('tbm','isch');url.searchParams.set('q',query);return url.toString();}
function renderStop(stop) {
  const fragment=stopTemplate.content.cloneNode(true), image=fragment.querySelector('.stop-image'), imageUrl=stop.imageUrl||stop.image;
  fragment.querySelector('.stop-type').textContent=stop.type||'Parada';
  fragment.querySelector('.stop-name').textContent=stop.name||'Local sem nome';
  const arrival=fragment.querySelector('.arrival');arrival.textContent=stop.arrival||'';arrival.hidden=!stop.arrival;
  const duration=fragment.querySelector('.duration');duration.textContent=stop.duration?`⏱ ${stop.duration}`:'';duration.hidden=!stop.duration;
  const address=getStopAddress(stop),addressLink=fragment.querySelector('.address-link');addressLink.hidden=!address;
  if(address){addressLink.href=mapLink(address);addressLink.querySelector('.address-text').textContent=address;addressLink.setAttribute('aria-label',`Abrir ${address} no Google Maps`);}
  const description=fragment.querySelector('.description');description.textContent=stop.description||'';description.hidden=!stop.description;
  const meta=renderStopMeta(stop);if(meta)fragment.querySelector('.stop-content').insertBefore(meta,addressLink);
  if(imageUrl){image.src=imageUrl;image.alt=stop.name||'Imagem da parada';image.addEventListener('error',()=>{image.hidden=true},{once:true});}else image.hidden=true;
  const images=fragment.querySelector('.images-button'),query=typeof stop.googleImages==='string'?stop.googleImages.trim():'';
  images.hidden=!query;if(query){images.href=imageLink(query);images.setAttribute('aria-label',`Ver imagens de ${stop.name||'esta parada'}`);}
  return fragment;
}
function renderStopMeta(stop) {
  const badges=[];
  if(stop.optional)badges.push('Opcional');
  if(stop.requiresTicket===true)badges.push('🎟 Ingresso necessário');
  if(stop.reservationRecommended===true)badges.push('📅 Reserva recomendada');
  const notes=[['🕐',stop.openingHours],['💶',stop.priceNote],['⚠️',stop.verificationNote]].filter(([,v])=>typeof v==='string'&&v.trim());
  const alternatives=Array.isArray(stop.alternatives)?stop.alternatives:[];
  if(!badges.length&&!notes.length&&!alternatives.length&&!stop.website&&!stop.fuelStation)return null;
  const meta=document.createElement('div');meta.className='stop-meta';
  if(badges.length){const list=document.createElement('div');list.className='stop-badges';badges.forEach(label=>{const el=document.createElement('span');el.className='stop-badge';el.textContent=label;list.append(el)});meta.append(list);}
  notes.forEach(([icon,value])=>{const p=document.createElement('p');p.className='stop-note';p.textContent=`${icon} ${value.trim()}`;meta.append(p)});
  if(Array.isArray(stop.routePoints)&&stop.routePoints.length>=2){
    const url=routePointsUrl(stop.routePoints);
    if(url)meta.append(makeLink('🚗 Abrir rota principal no Google Maps ↗',url,'stop-extra-link'));
  }
  if(stop.fuelStation && stop.fuelStation.address)meta.append(makeLink('⛽ Posto: '+stop.fuelStation.name+' ↗',mapLink(stop.fuelStation.address),'stop-extra-link'));
  if(stop.website)meta.append(makeLink('Site oficial ↗',stop.website,'stop-extra-link'));
  alternatives.forEach(alt=>{
    const box=document.createElement('details');box.className='stop-alternative';
    const summary=document.createElement('summary');summary.textContent=`Alternativa: ${alt.name}`;box.append(summary);
    if(alt.description){const p=document.createElement('p');p.textContent=alt.description;box.append(p)}
    if(alt.openingHours){const p=document.createElement('p');p.textContent=`Horário: ${alt.openingHours}`;box.append(p)}
    if(alt.verificationNote){const p=document.createElement('p');p.textContent=alt.verificationNote;box.append(p)}
    const links=document.createElement('div');links.className='alternative-links';
    if(Array.isArray(alt.routePoints)){const u=routePointsUrl(alt.routePoints);if(u)links.append(makeLink('🚗 Abrir rota alternativa ↗',u));}
    if(alt.address)links.append(makeLink('Google Maps ↗',mapLink(alt.address)));
    if(alt.googleImages)links.append(makeLink('Imagens ↗',imageLink(alt.googleImages)));
    if(alt.website)links.append(makeLink('Site oficial ↗',alt.website));
    box.append(links);meta.append(box);
  });return meta;
}
function makeLink(label,href,cls='') {const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';if(cls)a.className=cls;return a;}
function renderRoute(route,from,to,fromStop,toStop) {
  const leg=document.createElement('div');leg.className='route-leg';
  const rail=document.createElement('div');rail.className='route-rail';const marker=document.createElement('span');marker.className='route-marker';marker.setAttribute('aria-hidden','true');marker.textContent=route.mode==='walking'?'👟':route.mode==='transit'?'🚆':route.mode==='taxi'?'🚕':'🚗';rail.append(marker);
  const info=document.createElement('div');info.className='route-info';const label=document.createElement('span');label.className='route-label';label.textContent=`${from||'Esta parada'} → ${to||'próxima parada'}`;
  const details=document.createElement('strong');details.className='route-details';details.textContent=[route.distance,route.time||route.duration].filter(Boolean).join(' · ');info.append(label,details);if(fromStop && toStop && fromStop.address && toStop.address){const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('origin',fromStop.address);url.searchParams.set('destination',toStop.address);url.searchParams.set('travelmode',route.mode==='walking'?'walking':route.mode==='transit'?'transit':'driving');const a=makeLink('Abrir trajeto ↗',url.toString(),'leg-link');info.append(a);}leg.append(rail,info);return leg;
}
loadItinerary();
