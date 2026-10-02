const KEY='snowy-alpha-state-v1';
const CORE_URL='https://snowy-core.binholevy.workers.dev/';

const initial={onboarded:false,name:'Herbert',focus:'',memories:[],dna:[],watches:[],events:[],messages:[],feedback:[]};

let state=load();
let view=state.onboarded?'home':'welcome';

function load(){
  try{
    return {...initial,...JSON.parse(localStorage.getItem(KEY)||'{}')}
  }catch{
    return {...initial}
  }
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(state))
}

function esc(s=''){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]))
}

function remember(text,type='episodic',confidence=.7){
  state.memories.unshift({
    id:crypto.randomUUID(),
    text,
    type,
    confidence,
    at:new Date().toISOString()
  });

  state.memories=state.memories.slice(0,80);
}

function learnDNA(text,confidence=.65){
  if(!state.dna.some(x=>x.text.toLowerCase()===text.toLowerCase())){
    state.dna.unshift({
      id:crypto.randomUUID(),
      text,
      confidence,
      status:'inferred',
      at:new Date().toISOString()
    });
  }
}

function inferLocal(text){
  const t=text.toLowerCase();

  remember(text);

  if(/prefiro|gosto de|quero que você|quero que voce/.test(t)){
    learnDNA(text,.78);
  }

  if(/importante|prioridade/.test(t)){
    learnDNA('Valoriza que a Snowy destaque o que é realmente importante.',.72);
  }

  if(/diret/.test(t)){
    learnDNA('Prefere comunicação direta quando algo merece atenção.',.86);
  }

  if(/fique de olho|acompanhe|não me deixe esquecer|nao me deixe esquecer/.test(t)){
    state.watches.unshift({
      id:crypto.randomUUID(),
      text,
      status:'WATCHING',
      created:new Date().toISOString()
    });
  }
}

async function askSnowyCore(message){
  const response=await fetch(CORE_URL,{
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      message,
      context:{
        recent_messages:(state.messages||[]).slice(-10),
        events:(state.events||[]).slice(0,20),
        dna:(state.dna||[]).slice(0,20),
        focus:state.focus||''
      }
    })
  });

  const data=await response.json();

  if(!response.ok||!data.ok){
    throw new Error(
      data.details||
      data.error||
      'Snowy Core indisponível.'
    );
  }

  return data;
}

function applyUnderstanding(data,originalText){
  const u=data?.understanding;

  if(!u)return;

  if(!state.events){
    state.events=[];
  }

  if(u.operation==='merge'&&u.target_event_id){
    const targetIndex=state.events.findIndex(
      e=>e.id===u.target_event_id
    );

    const relatedIds=Array.isArray(u.related_event_ids)
      ?[...new Set(u.related_event_ids)].filter(
        id=>id&&id!==u.target_event_id
      )
      :[];

    const validRelatedIds=relatedIds.filter(id=>
      state.events.some(e=>e.id===id)
    );

    if(targetIndex!==-1&&validRelatedIds.length){
      const existing=state.events[targetIndex];

      const merged={
        ...existing,
        type:u.type||existing.type,
        date:u.date??existing.date,
        time:u.time??existing.time,
        action:existing.action||u.action,
        people:Array.isArray(u.people)&&u.people.length
          ?u.people
          :(existing.people||[]),
        location:u.location??existing.location,
        text:originalText,
        updated:new Date().toISOString()
      };

      state.events=state.events.filter(e=>
        e.id!==u.target_event_id&&
        !validRelatedIds.includes(e.id)
      );

      state.events.unshift(merged);
    }
  }

  if(u.operation==='update'&&u.target_event_id){
    const index=state.events.findIndex(
      e=>e.id===u.target_event_id
    );

    if(index!==-1){
      const existing=state.events[index];

      state.events[index]={
        ...existing,
        type:u.type||existing.type,
        date:u.date??existing.date,
        time:u.time??existing.time,
        action:existing.action||u.action,
        people:Array.isArray(u.people)&&u.people.length
          ?u.people
          :(existing.people||[]),
        location:u.location??existing.location,
        text:originalText,
        updated:new Date().toISOString()
      };

      state.events.unshift(
        state.events.splice(index,1)[0]
      );
    }
  }

  if(
    u.operation==='create'&&
    (u.type==='task'||u.type==='event')&&
    (u.date||u.time||u.action)
  ){
    const duplicate=state.events.some(e=>
      e.date===u.date&&
      e.time===u.time&&
      String(e.action||'').toLowerCase()===
      String(u.action||'').toLowerCase()
    );

    if(!duplicate){
      state.events.unshift({
        id:crypto.randomUUID(),
        type:u.type,
        date:u.date,
        time:u.time,
        action:u.action,
        people:u.people||[],
        location:u.location,
        text:originalText,
        created:new Date().toISOString()
      });
    }
  }

  if(u.type==='preference'&&u.action){
    learnDNA(u.action,.8);
  }
}
function nav(){
  return `<div class="nav"><div class="nav-inner">${
    [
      ['home','❄️','Snowy'],
      ['chat','💬','Conversar'],
      ['dna','🧬','Meu DNA'],
      ['life','◎','Minha Vida']
    ]
    .map(([v,i,l])=>
      `<button data-view="${v}" class="${view===v?'active':''}">${i}<br>${l}</button>`
    )
    .join('')
  }</div></div>`;
}

function saudacao(){
  const h=new Date().getHours();

  return h>=5&&h<12
    ?'Bom dia'
    :h>=12&&h<18
      ?'Boa tarde'
      :'Boa noite';
}

function render(){
  const app=document.querySelector('#app');

  if(view==='welcome'){
    app.innerHTML=`
      <section class="shell center">
        <div class="snow">
          <img src="apple-touch-icon.png" alt="Snowy">
        </div>
        <div class="brand">SNOWY</div>
        <h1 class="tag">Sua segunda pele.</h1>
        <p class="sub">Uma camada inteligente entre você e você mesmo.</p>
        <button class="primary" id="meet">Conhecer minha Snowy</button>
        <p class="tiny">Alpha 0.1 · User 0001</p>
      </section>
    `;

    document.querySelector('#meet').onclick=()=>{
      view='intro';
      render();
    };

    return;
  }

  if(view==='intro'){
    app.innerHTML=`
      <section class="shell center">
        <div class="snow">
          <img src="apple-touch-icon.png" alt="Snowy">
        </div>

        <h1>
          Olá, Herbert.<br>
          Eu sou a sua Snowy.
        </h1>

        <p class="sub">
          Neste momento ainda conheço muito pouco sobre você.
          Mas isso vai mudar.
          Não preciso que você me conte sua vida inteira.
          Vou aprender com você.
        </p>

        <p>
          <strong>
            Quanto mais você vive comigo, mais sua eu me torno.
          </strong>
        </p>

        <button class="primary" id="start">
          Vamos começar
        </button>
      </section>
    `;

    document.querySelector('#start').onclick=()=>{
      view='question';
      render();
    };

    return;
  }

  if(view==='question'){
    app.innerHTML=`
      <section class="shell center onboard">
        <div class="eyebrow">NOSSO PRIMEIRO PASSO</div>

        <h1>
          Qual é a primeira coisa que você gostaria
          que eu ajudasse a melhorar na sua vida?
        </h1>

        <p class="sub">
          Pode me contar do seu jeito.
        </p>

        <textarea
          id="focus"
          placeholder="Escreva naturalmente..."
        ></textarea>

        <button class="primary" id="continue">
          Continuar
        </button>
      </section>
    `;

    document.querySelector('#continue').onclick=()=>{
      const x=document.querySelector('#focus').value.trim();

      if(!x)return;

      state.focus=x;

      remember(x,'goal',.95);
      learnDNA('Prioridade inicial: '+x,.9);

      save();

      view='confirm';
      render();
    };

    return;
  }

  if(view==='confirm'){
    app.innerHTML=`
      <section class="shell center">
        <div class="snow">🧬</div>

        <h1>
          Seu Snowy DNA começou.
        </h1>

        <p class="sub">
          Entendi que, neste começo, você quer minha atenção especialmente para:
        </p>

        <div class="card">
          <strong>${esc(state.focus)}</strong>
        </div>

        <p class="sub">
          Vou aprender com você — suas preferências,
          prioridades, objetivos, hábitos e limites.
          Você sempre poderá me corrigir.
        </p>

        <h2>
          Você é único.<br>
          Assim como a sua Snowy.
        </h2>

        <button class="primary" id="finish">
          Entrar na minha Snowy
        </button>
      </section>
    `;

    document.querySelector('#finish').onclick=()=>{
      state.onboarded=true;

      state.messages=[{
        role:'snowy',
        text:'Estou começando a conhecer você. Pode falar comigo normalmente. Se quiser que eu acompanhe alguma coisa, é só me pedir.'
      }];

      save();

      view='home';
      render();
    };

    return;
  }

  const body=
    view==='home'
      ?home()
      :view==='chat'
        ?chat()
        :view==='dna'
          ?dna()
          :life();

  app.innerHTML=`
    <section class="shell">
      ${body}
    </section>
    ${nav()}
  `;

  bind();
}

function home(){
  return `
    <div class="home-simple">
      <h1 class="home-title">
        ${saudacao()}, Herbert.
      </h1>

      <p class="home-calm">
        Está tudo tranquilo por aqui.
      </p>

      <button class="primary" data-view="chat">
        🎙️ Falar com a Snowy
      </button>

      <p class="muted" style="text-align:center;margin-top:18px">
        ou escreva para mim...
      </p>
    </div>
  `;
}

function chat(){
  return `
    <h1 class="home-title">Conversar</h1>

    <div class="chat" id="messages">
      ${
        state.messages
          .map(m=>
            `<div class="bubble ${m.role==='user'?'user':'snowy'}">${esc(m.text)}</div>`
          )
          .join('')
      }
    </div>

    <div class="composer">
      <textarea
        id="msg"
        rows="3"
        autocomplete="off"
        placeholder="Fale comigo..."
      ></textarea>

      <button
        type="button"
        id="mic"
        class="mic"
        aria-label="Falar com a Snowy"
      >
        🎙️
      </button>

      <button class="send" id="send">
        ↑
      </button>
    </div>
  `;
}

function dna(){
  return `
    <h1 class="home-title">
      🧬 Meu DNA
    </h1>

    <p class="muted">
      O que estou aprendendo com você.
      Inferências têm confiança e podem ser corrigidas.
    </p>

    <div class="list">
      ${
        state.dna.length
          ?state.dna.map(x=>`
            <div class="item">
              <strong>${esc(x.text)}</strong><br>
              <span class="pill">
                ${Math.round(x.confidence*100)}% confiança
              </span>
              <span class="pill">
                ${x.status}
              </span>
            </div>
          `).join('')
          :'<div class="item">Ainda estamos começando.</div>'
      }
    </div>

    <div class="card">
      <div class="eyebrow">MEMÓRIA</div>

      <p>
        ${state.memories.length} registros locais nesta Alpha.
      </p>

      <button class="secondary" id="clearMemory">
        Apagar dados locais da Alpha
      </button>
    </div>
  `;
}

function life(){
  const events=state.events||[];

  return `
    <h1 class="home-title">
      ◎ Minha Vida
    </h1>

    <p class="muted">
      Primeira representação do seu Life Map.
    </p>

    <div class="card">
      <div class="eyebrow">
        PRIORIDADE INICIAL
      </div>

      <p>
        <strong>
          ${esc(state.focus||'Ainda não definida')}
        </strong>
      </p>
    </div>

    <div class="card">
      <div class="eyebrow">
        COMPROMISSOS E TAREFAS
      </div>

      ${
        events.length
          ?events.slice(0,10).map(e=>`
            <div class="item">
              <strong>
                ${esc(e.action||e.text||'Compromisso')}
              </strong>
              <br>

              <span class="pill">
                ${esc(e.date||'sem data')}
              </span>

              <span class="pill">
                ${esc(e.time||'sem horário')}
              </span>

              ${
                e.location
                  ?`<span class="pill">${esc(e.location)}</span>`
                  :''
              }
            </div>
          `).join('')
          :'<p class="muted">Nenhum compromisso registrado.</p>'
      }
    </div>

    <div class="card">
      <div class="eyebrow">
        SNOWY WATCH
      </div>

      ${
        state.watches.length
          ?state.watches.map(x=>`
            <div class="item">
              👁️ ${esc(x.text)}
              <br>
              <span class="pill">
                ${x.status}
              </span>
            </div>
          `).join('')
          :'<p class="muted">Nada em acompanhamento.</p>'
      }
    </div>
  `;
}

function bind(){
  document.querySelectorAll('[data-view]').forEach(b=>{
    b.onclick=()=>{
      view=b.dataset.view;
      render();
    };
  });

  const send=document.querySelector('#send');

  if(send){
    let sending=false;

    const go=async()=>{
      if(sending)return;

      const i=document.querySelector('#msg');
      const text=i.value.trim();

      if(!text)return;

      sending=true;

      state.messages.push({
        role:'user',
        text
      });

      inferLocal(text);

      save();
      render();

      try{
        const data=await askSnowyCore(text);

        applyUnderstanding(data,text);

        state.messages.push({
          role:'snowy',
          text:data.reply||'Entendi.'
        });

      }catch(error){
        console.error('Snowy Core:',error);

        state.messages.push({
          role:'snowy',
          text:'Tive uma dificuldade para acessar meu cérebro agora. Tente novamente em alguns instantes.'
        });
      }

      save();

      sending=false;

      render();

      setTimeout(()=>{
        document.querySelector('#messages')
          ?.lastElementChild
          ?.scrollIntoView({
            behavior:'smooth'
          });
      },0);
    };

    send.onclick=()=>{
      go();
    };

    document.querySelector('#msg').onkeydown=e=>{
      if(e.key==='Enter'&&!e.shiftKey){
        e.preventDefault();
        go();
      }
    };
  }

  const msg=document.querySelector('#msg');

  if(msg){
    const grow=()=>{
      msg.style.height='auto';
      msg.style.height=
        Math.min(msg.scrollHeight,180)+'px';
    };

    msg.addEventListener('input',grow);

    grow();
  }

  const mic=document.querySelector('#mic');

  if(mic){
    let r=null;
    let ouvindo=false;
    let parar=false;
    let base='';

    mic.onclick=()=>{
      const SR=
        window.SpeechRecognition||
        window.webkitSpeechRecognition;

      if(!SR){
        alert(
          'O reconhecimento de voz ainda não está disponível neste navegador.'
        );
        return;
      }

      if(ouvindo){
        parar=true;
        ouvindo=false;
        mic.style.color='';

        if(r){
          r.stop();
        }

        return;
      }

      parar=false;
      ouvindo=true;

      base=(
        document.querySelector('#msg')?.value||''
      ).trim();

      const iniciar=()=>{
        if(parar||!ouvindo)return;

        r=new SR();

        r.lang='pt-BR';
        r.interimResults=true;
        r.continuous=true;

        mic.style.color='red';

        r.onresult=e=>{
          let final='';
          let temp='';

          for(let n=0;n<e.results.length;n++){
            const x=e.results[n][0].transcript;

            if(e.results[n].isFinal){
              final+=x+' ';
            }else{
              temp+=x;
            }
          }

          const i=document.querySelector('#msg');

          if(i){
            i.value=(
              base+' '+final+temp
            ).trim();

            i.dispatchEvent(
              new Event('input')
            );
          }
        };

        r.onend=()=>{
          if(parar||!ouvindo){
            mic.style.color='';
            return;
          }

          const i=document.querySelector('#msg');

          base=(
            i?.value||base
          ).trim();

          setTimeout(()=>{
            if(ouvindo&&!parar){
              iniciar();
            }
          },250);
        };

        r.onerror=e=>{
          if(
            e.error==='not-allowed'||
            e.error==='service-not-allowed'
          ){
            parar=true;
            ouvindo=false;
            mic.style.color='';
          }
        };

        try{
          r.start();
        }catch(e){}
      };

      iniciar();
    };
  }

  const cm=document.querySelector('#clearMemory');

  if(cm){
    cm.onclick=()=>{
      if(confirm(
        'Apagar todos os dados locais desta Alpha?'
      )){
        localStorage.removeItem(KEY);

        state={...initial};

        view='welcome';

        render();
      }
    };
  }

  const mo=document.querySelector('#moment');

  if(mo){
    mo.onclick=()=>{
      state.feedback.unshift({
        type:'snowy_moment',
        at:new Date().toISOString()
      });

      save();

      alert(
        'Snowy Moment registrado. ⭐'
      );
    };
  }
}

if('serviceWorker' in navigator){
  navigator.serviceWorker
    .register('./sw.js')
    .catch(()=>{});
}

render();
