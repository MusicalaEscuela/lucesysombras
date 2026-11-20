/* Musicala | Laboratorio de luces y sombras
   Aplicación estática, sin dependencias ni comunicación con servidores. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const safeStorage = {
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
  };
  const notify = (message) => { const box = $('#screenReaderMessage'); if (box) box.textContent = message; };

  // Simulador: las formas y sus sombras se actualizan al mover los controles.
  const canvas = $('#lightCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const w = 760, h = 500;
  const defaultLight = { angle: -45, height: 45, intensity: 75, shape: 'sphere', labels: true };
  const lightState = { ...defaultLight };
  const shapeNames = { sphere: 'Esfera', cylinder: 'Cilindro', cube: 'Cubo' };
  const sphereLayer = document.createElement('canvas');
  sphereLayer.width = sphereLayer.height = 244;
  const sphereContext = sphereLayer.getContext('2d');
  const spherePixels = sphereContext?.createImageData(244, 244);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const bright = (v) => Math.round(clamp(v, 0, 1) * 255);
  const rgba = (value, alpha = 1) => `rgba(${value}, ${value}, ${value}, ${alpha})`;
  function roundLabel(text, x, y, anchorX, anchorY, align = 'left') {
    const fontSize = 15;
    ctx.font = `700 ${fontSize}px Roboto, Arial, sans-serif`;
    const width = Math.ceil(ctx.measureText(text).width) + 27;
    const rx = align === 'right' ? x - width : x;
    ctx.strokeStyle = 'rgba(249,247,255,.64)';ctx.lineWidth = 1.4;
    ctx.beginPath();ctx.moveTo(rx + (align === 'right' ? width : 0),y + 17);ctx.lineTo(anchorX,anchorY);ctx.stroke();
    ctx.fillStyle = '#ce0071';ctx.beginPath();ctx.arc(anchorX,anchorY,4.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = 'rgba(21,18,45,.88)';
    ctx.beginPath();ctx.roundRect(rx,y,width,35,9);ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)';ctx.stroke();
    ctx.fillStyle = '#f5f2ff';ctx.fillText(text,rx+13,y+23);
  }
  function drawSphere(lx, ly, lz, power) {
    const cx=380,cy=258,r=122,diam=r*2;
    const dst=spherePixels.data;
    const norm=Math.hypot(lx,ly,lz);lx/=norm;ly/=norm;lz/=norm;
    const Hx=lx,Hy=ly,Hz=lz+1;const Hnorm=Math.hypot(Hx,Hy,Hz);
    for(let y=0;y<diam;y++) for(let x=0;x<diam;x++) {
      const X=(x+.5-r)/r,Y=(r-y-.5)/r,d2=X*X+Y*Y,i=(y*diam+x)*4;
      if(d2>=1){dst[i+3]=0;continue;}
      const Z=Math.sqrt(1-d2),dot=Math.max(0,X*lx+Y*ly+Z*lz);
      const spec=Math.pow(Math.max(0,(X*Hx+Y*Hy+Z*Hz)/Hnorm),40)*.29*power;
      const occlusion=.10*Math.max(0,-Y);
      const val=clamp(.12+.73*power*dot+spec-occlusion,0,1);
      const v=bright(val);
      dst[i]=v;dst[i+1]=v;dst[i+2]=v;dst[i+3]=255;
    }
    // Componer en un lienzo auxiliar para conservar el suelo bajo los píxeles transparentes.
    sphereContext.putImageData(spherePixels,0,0);
    ctx.drawImage(sphereLayer,cx-r,cy-r);
  }
  function drawCylinder(lx, ly, power) {
    const x=304,y=173,width=152,bottom=362;
    const gradient=ctx.createLinearGradient(x,0,x+width,0);
    const center=clamp(.44+lx*.31,.14,.85);
    const stops=[[0,.14],[clamp(center*.6,.05,.43),.37*power],[center,.82*power+.1],[clamp(center+.2,.2,.91),.42*power],[1,.12]];
    stops.sort((a,b)=>a[0]-b[0]);for(const [at,b] of stops)gradient.addColorStop(at,rgba(bright(b)));
    ctx.fillStyle=gradient;ctx.beginPath();ctx.rect(x,y,width,bottom-y);ctx.fill();
    ctx.fillStyle='#71717d';ctx.beginPath();ctx.ellipse(x+width/2,y,width/2,27,0,0,2*Math.PI);ctx.fill();
    const top=ctx.createLinearGradient(x,y-25,x+width,y+28);
    const topLight=.22+.70*ly*power;
    top.addColorStop(0,rgba(bright(topLight-lx*.12*power)));
    top.addColorStop(1,rgba(bright(topLight+lx*.12*power)));
    ctx.fillStyle=top;ctx.beginPath();ctx.ellipse(x+width/2,y,width/2,27,0,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle=rgba(bright(topLight+.08));ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#aaaab0';ctx.beginPath();ctx.ellipse(x+width/2,bottom,width/2,15,0,0,2*Math.PI);ctx.fill();
    ctx.fillStyle=gradient;ctx.fillRect(x,bottom-14,width,14);
  }
  function drawCube(lx,ly,lz,power) {
    const left=310,top=198,right=446,bottom=355,d=44;
    // Cara superior
    ctx.fillStyle=rgba(bright(.19+.78*ly*power));ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left+d,top-d);ctx.lineTo(right+d,top-d);ctx.lineTo(right,top);ctx.closePath();ctx.fill();
    // Cara frontal
    ctx.fillStyle=rgba(bright(.19+.78*lz*power));ctx.fillRect(left,top,right-left,bottom-top);
    // Cara derecha
    ctx.fillStyle=rgba(bright(.15+.78*Math.max(0,lx)*power));ctx.beginPath();ctx.moveTo(right,top);ctx.lineTo(right+d,top-d);ctx.lineTo(right+d,bottom-d);ctx.lineTo(right,bottom);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#ffffff24';ctx.strokeRect(left,top,right-left,bottom-top);
  }
  function renderLight() {
    const angle = lightState.angle * Math.PI / 180;
    const elevation = lightState.height * Math.PI / 180;
    const lx = Math.sin(angle) * Math.cos(elevation);
    const ly = Math.sin(elevation);
    const lz = Math.cos(angle) * Math.cos(elevation);
    const power=lightState.intensity/100;
    const direction = lightState.angle < 0 ? 'izquierda' : lightState.angle > 0 ? 'derecha' : 'centro';
    const shadowDirection = lightState.angle < 0 ? 'derecha' : lightState.angle > 0 ? 'izquierda' : 'detrás del objeto';
    const length = lightState.height < 40 ? 'larga' : lightState.height > 55 ? 'corta' : 'media';
    $('#lightSummary').textContent = `${shapeNames[lightState.shape]} · Luz desde ${direction === 'centro' ? 'el' : 'la'} ${direction}, a ${lightState.height}° · Intensidad ${lightState.intensity} % · Sombra ${length} ${direction === 'centro' ? '' : 'hacia la '}${shadowDirection}.`;
    $('#angleOutput').textContent = `${lightState.angle > 0 ? '+' : ''}${lightState.angle}°`;
    $('#heightOutput').textContent = `${lightState.height}°`;
    $('#intensityOutput').textContent = `${lightState.intensity} %`;
    if (!ctx || !spherePixels) return;
    ctx.clearRect(0,0,w,h);
    // Sutil superficie horizontal que da contexto a la sombra.
    const ground=ctx.createLinearGradient(0,350,0,h);ground.addColorStop(0,'rgba(220,220,242,.08)');ground.addColorStop(1,'rgba(220,220,242,.01)');ctx.fillStyle=ground;ctx.fillRect(0,350,w,150);
    ctx.strokeStyle='rgba(223,224,255,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,357);ctx.lineTo(720,357);ctx.stroke();
    // Sombra proyectada: se desplaza en dirección opuesta a la luz.
    const reach = 64 / Math.tan(elevation);
    const xShadow = 380 - Math.sin(angle) * reach;
    const yShadow = 387 - Math.cos(angle) * reach * .32;
    ctx.save();
    ctx.filter = 'blur(12px)';
    ctx.fillStyle = `rgba(1,1,10,${.42+.37*power})`;
    ctx.beginPath();
    ctx.ellipse(xShadow,yShadow,74+Math.abs(Math.sin(angle))*reach*.65,21+Math.cos(angle)*reach*.19,-Math.sin(angle)*.15,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
    if(lightState.shape==='cylinder')drawCylinder(lx,ly,power);
    else if(lightState.shape==='cube')drawCube(lx,ly,lz,power);
    else drawSphere(lx,ly,lz,power);
    // Foco de luz y rayo punteado: referentes esquemáticos, no ray tracing físico.
    const lampX=380+Math.sin(angle)*310,lampY=145-(lightState.height-25)*2;ctx.save();ctx.setLineDash([7,8]);ctx.lineWidth=2;ctx.strokeStyle=`rgba(249,240,255,${.2+.32*power})`;ctx.beginPath();ctx.moveTo(lampX,lampY);ctx.lineTo(380,210);ctx.stroke();ctx.restore();
    const halo=ctx.createRadialGradient(lampX,lampY,2,lampX,lampY,52);halo.addColorStop(0,`rgba(251,250,255,${.55*power})`);halo.addColorStop(1,'rgba(251,250,255,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(lampX,lampY,52,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(lampX,lampY,9,0,Math.PI*2);ctx.fill();
    if(lightState.labels){
      const leftSide=lx<0;
      roundLabel('Zona iluminada',leftSide?62:500,130,leftSide?315:440,215,leftSide?'left':'left');
      roundLabel('Sombra propia',leftSide?498:54,270,leftSide?449:323,303,'left');
      roundLabel('Sombra proyectada',leftSide?472:35,421,xShadow,yShadow+20);
    }
  }
  $('#angleSlider').addEventListener('input',e=>{lightState.angle=Number(e.target.value);renderLight()});
  $('#heightSlider').addEventListener('input',e=>{lightState.height=Number(e.target.value);renderLight()});
  $('#intensitySlider').addEventListener('input',e=>{lightState.intensity=Number(e.target.value);renderLight()});
  $('#toggleLabels').addEventListener('change',e=>{lightState.labels=e.target.checked;renderLight()});
  $$('.shape-btn').forEach(btn=>btn.addEventListener('click',()=>{
    lightState.shape=btn.dataset.shape;
    $$('.shape-btn').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false')});
    renderLight();notify(`Objeto seleccionado: ${btn.textContent}.`);
  }));
  $('#resetLight').addEventListener('click',()=>{
    Object.assign(lightState,defaultLight);
    $('#angleSlider').value=defaultLight.angle;
    $('#heightSlider').value=defaultLight.height;
    $('#intensitySlider').value=defaultLight.intensity;
    $('#toggleLabels').checked=defaultLight.labels;
    $$('.shape-btn').forEach(b=>{const active=b.dataset.shape==='sphere';b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false')});
    renderLight();notify('Simulación restaurada.');
  });
  renderLight();

  // Explorador de valores tonales.
  const tones=[245,224,205,183,160,135,108,79,47,16];
  function toneCategory(index){return index<3?'Gris claro':index<7?'Gris medio':'Gris oscuro'}
  function toneDescription(index){
    if(index<3)return 'Un valor claro ayuda a representar las zonas que reciben más iluminación.';
    if(index<7)return 'Los valores intermedios unen las zonas iluminadas con las zonas en sombra.';
    return 'Los valores oscuros construyen las sombras más profundas y aumentan el contraste.';
  }
  function setTone(i) {
    $$('.swatch').forEach((b,n)=>{const selected=n===i;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected?'true':'false')});
    const value=tones[i];$('#toneSample').style.backgroundColor=`rgb(${value},${value},${value})`;
    $('#toneName').textContent=`Valor ${String(i+1).padStart(2,'0')} · ${toneCategory(i)}`;
    $('#toneDescription').textContent=toneDescription(i);
    $('#toneNumber').textContent=`${String(i+1).padStart(2,'0')}/10`;
  }
  tones.forEach((value,i)=>{
    const b=document.createElement('button');b.className='swatch';b.type='button';b.title=`Valor ${i+1}: ${toneCategory(i)}`;
    b.setAttribute('aria-label',`Seleccionar valor tonal ${i+1} de 10, ${toneCategory(i)}`);b.setAttribute('aria-pressed','false');
    b.style.backgroundColor=`rgb(${value},${value},${value})`;
    const span=document.createElement('span');span.style.color=value>130?'#262435':'#fff';span.textContent=String(i+1).padStart(2,'0');b.appendChild(span);
    b.addEventListener('click',()=>setTone(i));$('#swatchGrid').appendChild(b);
  });
  setTone(4);

  // Reto: seleccionar dos fichas para intercambiarlas, también funciona con teclado y en móvil.
  const cards=[244,194,137,80,21];const initialOrder=[2,0,4,1,3];let order=[...initialOrder];let selectedTile=null;
  function renderSort(){
    const holder=$('#sortTiles');holder.replaceChildren();
    order.forEach((toneId,index)=>{
      const v=cards[toneId],b=document.createElement('button');b.type='button';b.className='sort-tile';
      if(selectedTile===index)b.classList.add('selected');
      b.style.backgroundColor=`rgb(${v},${v},${v})`;
      b.setAttribute('aria-label',`Tarjeta en posición ${index+1}, tono ${toneId+1} de cinco. ${selectedTile===index?'Seleccionada.':''}`);
      b.setAttribute('aria-pressed',String(selectedTile===index));
      const label=document.createElement('span');label.textContent=`0${index+1}`;label.style.color=v>135?'#151526':'#fff';b.appendChild(label);
      b.addEventListener('click',()=>{
        if(selectedTile===null){selectedTile=index;$('#sortStatus').textContent=`Posición ${index+1} seleccionada. Elige con cuál intercambiarla.`;}
        else if(selectedTile===index){selectedTile=null;$('#sortStatus').textContent='Selección cancelada. Elige dos tonos.';}
        else{[order[selectedTile],order[index]]=[order[index],order[selectedTile]];selectedTile=null;$('#sortStatus').textContent='Tarjetas intercambiadas. Sigue hasta ordenarlas.';}
        renderSort();
        holder.children[index].focus({ preventScroll: true });
      });holder.appendChild(b);
    });
  }
  $('#checkOrder').addEventListener('click',()=>{
    const right=order.every((n,i)=>n===i);
    $('#sortStatus').textContent=right?'¡Excelente! Ordenaste correctamente los valores de claro a oscuro.':'Todavía no está en orden. Compara los tonos y vuelve a intentarlo.';
  });
  $('#shuffleOrder').addEventListener('click',()=>{
    // Fisher-Yates; evita mostrar una secuencia que ya esté ordenada.
    do{order=[0,1,2,3,4];for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}}while(order.every((n,i)=>n===i));
    selectedTile=null;renderSort();$('#sortStatus').textContent='Tonos mezclados. ¡Vuelve a intentarlo!';
  });
  renderSort();

  // Evaluación con retroalimentación inmediata.
  const questions=[
    {q:'¿Qué estudias cuando trabajas los valores tonales?',a:['La temperatura de los colores','Qué tan claro u oscuro se ve algo','El tamaño exacto de los objetos'],correct:1,why:'Los valores tonales describen las diferencias de claridad y oscuridad que permiten representar luces, sombras y volumen.'},
    {q:'¿Cuál de estas opciones describe la sombra propia?',a:['La sombra que aparece en el mismo objeto','Una sombra que solo se ve en la pared','El brillo más fuerte de un material'],correct:0,why:'La sombra propia es la zona del objeto que recibe menos luz y se representa con valores más oscuros.'},
    {q:'Si la luz ilumina un objeto desde la izquierda, ¿hacia dónde suele extenderse su sombra proyectada?',a:['Hacia la izquierda','Hacia el lado contrario, a la derecha','Siempre hacia el centro'],correct:1,why:'La sombra proyectada se forma en la dirección opuesta a la fuente de luz, sobre la superficie que rodea al objeto.'},
    {q:'Según la guía de la profe, ¿con qué tono se inicia el boceto del ejercicio?',a:['Con el tono más oscuro','Con cualquier tono al azar','Con el tono más claro de la paleta'],correct:2,why:'La secuencia de la guía comienza con el tono más claro, incorpora después los intermedios y termina con los tonos más oscuros.'},
    {q:'¿Por qué conviene observar reflejos y transparencias?',a:['Porque cambian cómo percibimos el volumen y la luz','Porque todos los objetos reflejan igual','Porque reemplazan la necesidad de observar sombras'],correct:0,why:'Los materiales reaccionan de maneras distintas a la luz; sus reflejos, transparencias y contrastes revelan características de la forma.'},
    {q:'¿Qué te ayudará a desarrollar mejor la profundidad de tu pintura?',a:['Usar un solo gris en toda la superficie','Comparar luces, tonos intermedios y sombras','Pintar los detalles antes de observar'],correct:1,why:'El contraste entre valores claros, intermedios y oscuros es una de las claves para construir profundidad y volumen.'}
  ];
  let currentQuestion=0,score=0,answered=false;
  const letters=['A','B','C'];
  function renderQuiz(moveFocus = false) {
    const area=$('#quizQuestionArea');const feedback=$('#quizFeedback');feedback.hidden=true;
    const next=$('#quizNext');next.disabled=true;answered=false;
    $('#quizCounter').textContent=`PREGUNTA ${String(currentQuestion+1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}`;
    $('#quizScore').textContent=`${score} ACIERTO${score===1?'':'S'}`;
    $('#quizProgressFill').style.width=`${(currentQuestion/questions.length)*100}%`;
    $('#quizHelp').textContent='Escoge una respuesta.';
    next.innerHTML='Siguiente <span aria-hidden="true">→</span>';
    area.replaceChildren();const item=questions[currentQuestion];
    const title=document.createElement('h3');title.textContent=item.q;title.tabIndex=-1;area.appendChild(title);
    const opts=document.createElement('div');opts.className='quiz-options';
    item.a.forEach((answer,i)=>{
      const option=document.createElement('button');option.type='button';option.className='quiz-option';
      const letter=document.createElement('span');letter.className='option-letter';letter.textContent=letters[i];
      const value=document.createElement('span');value.textContent=answer;option.append(letter,value);
      option.addEventListener('click',()=>{
        if(answered)return;answered=true;const correct=i===item.correct;
        if(correct)score++;
        $$('.quiz-option').forEach((b,j)=>{b.disabled=true;if(j===item.correct)b.classList.add('correct');else if(j===i)b.classList.add('incorrect')});
        feedback.hidden=false;feedback.replaceChildren();const strong=document.createElement('strong');strong.textContent=correct?'¡Muy bien!':'Buen intento. Esta es la clave:';
        const reason=document.createElement('span');reason.textContent=item.why;feedback.append(strong,reason);
        $('#quizScore').textContent=`${score} ACIERTO${score===1?'':'S'}`;
        $('#quizHelp').textContent=correct?'Respuesta correcta':'Sigue aprendiendo';
        next.disabled=false;if(currentQuestion===questions.length-1)next.innerHTML='Ver mi resultado <span aria-hidden="true">→</span>';
        feedback.tabIndex=-1;
        feedback.focus({ preventScroll: true });
      });opts.appendChild(option);
    });area.appendChild(opts);
    if (moveFocus) title.focus();
  }
  function quizResult() {
    $('#quizProgressFill').style.width='100%';$('#quizCounter').textContent='EVALUACIÓN COMPLETADA';$('#quizHelp').textContent='Puedes volver a practicar.';
    $('#quizFeedback').hidden=true;$('#quizNext').disabled=false;$('#quizNext').innerHTML='Repetir evaluación <span aria-hidden="true">↻</span>';
    const area=$('#quizQuestionArea');area.replaceChildren();
    const box=document.createElement('div');box.className='quiz-result';
    const mark=document.createElement('div');mark.className='result-icon';mark.textContent=score>=5?'✦':'◉';
    const number=document.createElement('div');number.className='result-score';number.textContent=`${score}/${questions.length}`;
    const heading=document.createElement('h3');heading.textContent=score===6?'¡Tienes una mirada artística muy afinada!':score>=4?'¡Vas por muy buen camino!':'Cada intento entrena tu observación.';
    const message=document.createElement('p');message.textContent=score===6?'¡Dominaste los conceptos! Ahora ponlos en práctica con un objeto real.':score>=4?'Revisa las explicaciones de las preguntas y sigue experimentando.':'Prueba el laboratorio y la paleta de grises, luego vuelve a intentarlo.';
    box.append(mark,number,heading,message);area.appendChild(box);
    number.tabIndex=-1;
    number.setAttribute('aria-label', `Resultado: ${score} de ${questions.length} aciertos`);
    number.focus();
    safeStorage.set('musicala-luces-ultimo-resultado',`${score}/${questions.length}`);
  }
  $('#quizNext').addEventListener('click',()=>{
    if(currentQuestion>=questions.length){currentQuestion=0;score=0;renderQuiz(true);return;}
    if(!answered)return;
    currentQuestion++;
    if(currentQuestion>=questions.length)quizResult();else renderQuiz(true);
  });
  renderQuiz();
})();
