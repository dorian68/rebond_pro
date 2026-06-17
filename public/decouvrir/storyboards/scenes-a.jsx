/* Vidéo A — Centres de formation. Scenes composed on the animations.jsx engine.
   Globals from animations.jsx: Stage, Sprite, useSprite, useTime, Easing, interpolate, animate, clamp. */

const A = {
  cream:'#FAF5EC', navy:'#15314C', teal:'#2C8E86', green:'#5FB14E',
  orange:'#E07C39', paper:'#FFFFFF',
  serif:"'Newsreader',Georgia,serif", sans:"'Plus Jakarta Sans',system-ui,sans-serif",
};

/* ---------- helpers ---------- */
function useFade(fin = 0.45, fout = 0.5) {
  const { localTime, duration } = useSprite();
  if (localTime < fin) return clamp(localTime / fin, 0, 1);
  if (localTime > duration - fout) return clamp((duration - localTime) / fout, 0, 1);
  return 1;
}
function rise(localTime, start, dur = 0.65, dist = 30) {
  const t = Easing.easeOutCubic(clamp((localTime - start) / dur, 0, 1));
  return { opacity: t, transform: `translateY(${(1 - t) * dist}px)` };
}
function SceneBox({ bg, children, color }) {
  const o = useFade();
  return (
    <div style={{ position:'absolute', inset:0, background:bg, color:color||A.navy, opacity:o, overflow:'hidden' }}>
      {children}
    </div>
  );
}
function Eyebrow({ children, localTime, start = 0, center, light }) {
  const s = rise(localTime, start, 0.5, 16);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:18, justifyContent:center?'center':'flex-start', ...s }}>
      <span style={{ width:64, height:5, borderRadius:3, background:A.green }}></span>
      <span style={{ fontFamily:A.sans, fontSize:27, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:light?A.green:A.teal }}>{children}</span>
    </div>
  );
}
function Subtitle({ children, localTime, start = 0.3 }) {
  const t = clamp((localTime - start) / 0.35, 0, 1);
  return (
    <div style={{
      position:'absolute', left:'50%', bottom:70, transform:'translateX(-50%)',
      opacity:t, background:'rgba(21,49,76,.92)', color:'#fff', fontFamily:A.sans,
      fontWeight:600, fontSize:38, lineHeight:1.25, padding:'16px 30px', borderRadius:8,
      maxWidth:1480, textAlign:'center', whiteSpace:'nowrap',
    }}>{children}</div>
  );
}
function Logo({ size = 1, light, center }) {
  const m = 74 * size;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:24*size, justifyContent:center?'center':'flex-start' }}>
      <span style={{ width:m, height:m, borderRadius:'50%', background:`linear-gradient(135deg,${A.teal},${A.green})`, position:'relative', flex:'none' }}>
        <span style={{ position:'absolute', inset:'24%', borderRadius:'50%', background:light?A.navy:A.cream }}></span>
      </span>
      <span style={{ fontFamily:A.serif, fontWeight:600, fontSize:56*size, lineHeight:.96, color:light?A.cream:A.navy, letterSpacing:'-.01em' }}>
        Le Bon<br/>Rebond
      </span>
    </div>
  );
}
function Browser({ src, style }) {
  return (
    <div style={{ position:'absolute', borderRadius:'18px 18px 0 0', overflow:'hidden', background:'#fff',
      boxShadow:'0 60px 100px -34px rgba(21,49,76,.55)', border:'1px solid rgba(21,49,76,.08)', ...style }}>
      <div style={{ height:48, background:'#efeadf', display:'flex', alignItems:'center', gap:11, padding:'0 24px', borderBottom:'1px solid rgba(21,49,76,.07)' }}>
        <span style={{ width:15, height:15, borderRadius:'50%', background:'#d9d2c4' }}></span>
        <span style={{ width:15, height:15, borderRadius:'50%', background:'#d9d2c4' }}></span>
        <span style={{ width:15, height:15, borderRadius:'50%', background:'#d9d2c4' }}></span>
        <span style={{ marginLeft:18, height:26, flex:1, maxWidth:540, background:'#fff', borderRadius:14, border:'1px solid rgba(21,49,76,.08)' }}></span>
      </div>
      <img src={src} alt="" style={{ display:'block', width:'100%' }} />
    </div>
  );
}

/* ---------- INTRO ---------- */
function Intro() {
  const { localTime } = useSprite();
  const ls = rise(localTime, 0.1, 0.7, 18);
  const ts = rise(localTime, 0.7, 0.7, 20);
  return (
    <SceneBox bg={A.navy} color={A.cream}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:46 }}>
        <div style={ls}><Logo size={1.25} light center /></div>
        <div style={{ ...ts, fontFamily:A.sans, fontSize:30, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:A.green }}>
          Pour les centres de formation
        </div>
      </div>
    </SceneBox>
  );
}

/* ---------- S1 — douleur ---------- */
function Note({ localTime, start, top, left, rot, children }) {
  const t = Easing.easeOutBack(clamp((localTime - start) / 0.5, 0, 1));
  const wob = Math.sin((localTime - start) * 3) * 0.6;
  return (
    <div style={{
      position:'absolute', top, left,
      transform:`rotate(${rot + wob}deg) scale(${0.6 + 0.4 * t})`, opacity:clamp(t,0,1),
      fontFamily:A.sans, fontSize:30, fontWeight:600, color:'rgba(21,49,76,.55)',
      background:A.paper, border:'1px solid rgba(21,49,76,.12)', borderRadius:18,
      padding:'18px 26px', boxShadow:'0 30px 50px -28px rgba(21,49,76,.4)', whiteSpace:'nowrap',
    }}>{children}</div>
  );
}
function S1() {
  const { localTime } = useSprite();
  return (
    <SceneBox bg={A.cream}>
      <Note localTime={localTime} start={0.6} top={150} left={1180} rot={5}>Relance oubliée…</Note>
      <Note localTime={localTime} start={1.0} top={560} left={1280} rot={-4}>Convention.docx</Note>
      <Note localTime={localTime} start={1.4} top={360} left={1500} rot={8}>Session — 7 %</Note>
      <Note localTime={localTime} start={1.8} top={770} left={1120} rot={3}>planning_v4_FINAL.xlsx</Note>
      <div style={{ position:'absolute', top:300, left:130, width:980 }}>
        <Eyebrow localTime={localTime} start={0.1}>Aujourd'hui</Eyebrow>
        <h1 style={{ ...rise(localTime, 0.45, 0.8, 30), fontFamily:A.serif, fontWeight:500, fontSize:104, lineHeight:1.04, letterSpacing:'-.01em', margin:'34px 0 0' }}>
          Votre centre tourne sur Excel,<br/>vos mails… et <em style={{ color:A.teal, fontStyle:'italic' }}>votre mémoire.</em>
        </h1>
      </div>
      <Subtitle localTime={localTime} start={0.5}>Excel, mails, relances oubliées… ça vous parle ?</Subtitle>
    </SceneBox>
  );
}

/* ---------- S2 — tension ---------- */
function S2() {
  const { localTime } = useSprite();
  const raw = interpolate([0.3, 2.2], [0, 4000], Easing.easeOutCubic)(localTime);
  const val = (Math.round(raw / 100) * 100).toLocaleString('fr-FR');
  const fade = clamp((localTime - 3.2) / 1.2, 0, 1); // loss: number pales
  return (
    <SceneBox bg={A.cream}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <Eyebrow localTime={localTime} start={0.1} center>Le coût réel</Eyebrow>
        <div style={{ fontFamily:A.serif, fontWeight:500, fontSize:248, lineHeight:.9, letterSpacing:'-.02em', margin:'26px 0 10px',
          color:A.orange, opacity:1 - fade*0.62, filter:`grayscale(${fade})`, transform:`translateY(${fade*10}px)` }}>
          {val}&nbsp;€
        </div>
        <h1 style={{ ...rise(localTime, 2.0, 0.7, 24), fontFamily:A.serif, fontWeight:500, fontSize:72, lineHeight:1.06, margin:0 }}>
          Une session à moitié vide, c'est<br/><em style={{ color:A.teal, fontStyle:'italic' }}>du chiffre d'affaires qui s'envole.</em>
        </h1>
      </div>
      <Subtitle localTime={localTime} start={2.2}>Une session sous-remplie = des milliers d'euros perdus.</Subtitle>
    </SceneBox>
  );
}

/* ---------- S3 — révélation dashboard ---------- */
function S3() {
  const { localTime } = useSprite();
  const slide = animate({ from:160, to:0, start:0.2, end:1.2, ease:Easing.easeOutCubic })(localTime);
  const op = clamp((localTime - 0.2) / 0.6, 0, 1);
  const zoom = 1 + 0.05 * clamp((localTime - 1.2) / 7, 0, 1);
  const ring = (Math.sin((localTime - 1.5) * 2.4) * 0.5 + 0.5) * clamp((localTime - 1.5) / 0.5, 0, 1);
  return (
    <SceneBox bg={A.cream}>
      <div style={{ position:'absolute', top:0, bottom:0, left:760, right:-220, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:150, left:60, width:1340, opacity:op, transform:`translateX(${slide}px) scale(${zoom})`, transformOrigin:'left center' }}>
          <Browser src="../assets/20-dashboard.webp" style={{ position:'relative', width:'100%' }} />
          {/* highlight ring over taux de remplissage KPI */}
          <div style={{ position:'absolute', top:'17%', left:'46.5%', width:'15%', height:'15%', border:`3px solid ${A.orange}`, borderRadius:14, opacity:ring, boxShadow:`0 0 0 8px rgba(224,124,57,${ring*0.16})` }}></div>
        </div>
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,${A.cream} 0%, rgba(250,245,236,0) 16%)` }}></div>
      </div>
      <div style={{ position:'absolute', top:'50%', left:130, width:600, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>La solution</Eyebrow>
        <h1 style={{ ...rise(localTime, 0.4, 0.7, 26), fontFamily:A.serif, fontWeight:500, fontSize:86, lineHeight:1.04, margin:'30px 0 0' }}>
          Et si tout votre centre tenait sur <em style={{ color:A.teal, fontStyle:'italic' }}>un seul écran ?</em>
        </h1>
      </div>
      <Subtitle localTime={localTime} start={0.6}>Voici le cockpit Le Bon Rebond.</Subtitle>
    </SceneBox>
  );
}

/* ---------- S4 — différenciateur pilotage ---------- */
function Toast({ localTime, start, top, left, accent, label, sub }) {
  const t = Easing.easeOutBack(clamp((localTime - start) / 0.5, 0, 1));
  return (
    <div style={{ position:'absolute', top, left, transform:`translateY(${(1-clamp(t,0,1))*24}px) scale(${0.8+0.2*t})`, opacity:clamp(t,0,1),
      background:A.paper, borderRadius:18, padding:'20px 26px', boxShadow:'0 40px 70px -30px rgba(21,49,76,.5)', border:'1px solid rgba(21,49,76,.08)', display:'flex', alignItems:'center', gap:18 }}>
      <span style={{ width:46, height:46, borderRadius:'50%', background:accent, flex:'none', position:'relative' }}>
        <span style={{ position:'absolute', left:'34%', top:'22%', width:'24%', height:'42%', border:'solid #fff', borderWidth:'0 5px 5px 0', transform:'rotate(42deg)' }}></span>
      </span>
      <div>
        <div style={{ fontFamily:A.sans, fontWeight:700, fontSize:30, color:A.navy }}>{label}</div>
        {sub && <div style={{ fontFamily:A.sans, fontSize:23, color:'#6b7785', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}
function S4() {
  const { localTime } = useSprite();
  const slide = animate({ from:-150, to:0, start:0.2, end:1.2, ease:Easing.easeOutCubic })(localTime);
  const op = clamp((localTime - 0.2) / 0.6, 0, 1);
  const zoom = 1 + 0.045 * clamp((localTime - 1.2) / 6, 0, 1);
  return (
    <SceneBox bg={A.cream}>
      <div style={{ position:'absolute', top:0, bottom:0, left:-220, right:760, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:170, left:140, width:1320, opacity:op, transform:`translateX(${slide}px) scale(${zoom})`, transformOrigin:'right center' }}>
          <Browser src="../assets/23-prospects.webp" style={{ position:'relative', width:'100%' }} />
        </div>
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(270deg,${A.cream} 0%, rgba(250,245,236,0) 18%)` }}></div>
      </div>
      <Toast localTime={localTime} start={2.0} top={250} left={560} accent={A.green} label="Relance → Gagné" sub="déclenchée automatiquement" />
      <Toast localTime={localTime} start={3.4} top={560} left={520} accent={A.teal} label="Convention générée" sub="PDF · prêt à envoyer" />
      <div style={{ position:'absolute', top:'50%', left:1130, width:660, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>Différenciateur 1</Eyebrow>
        <h1 style={{ ...rise(localTime, 0.4, 0.7, 26), fontFamily:A.serif, fontWeight:500, fontSize:62, lineHeight:1.05, margin:'26px 0 32px' }}>
          Vos prospects relancés, vos docs <em style={{ color:A.teal, fontStyle:'italic' }}>générés tout seuls.</em>
        </h1>
        <p style={{ ...rise(localTime, 0.7, 0.7, 22), fontFamily:A.sans, fontSize:34, lineHeight:1.4, color:'#46586b', margin:0 }}>
          Fini les relances oubliées et les conventions à la main.
        </p>
      </div>
      <Subtitle localTime={localTime} start={0.6}>Relances automatiques · documents en un clic</Subtitle>
    </SceneBox>
  );
}

/* ---------- S5 — différenciateur marketplace ---------- */
function S5() {
  const { localTime } = useSprite();
  const slide = animate({ from:170, to:0, start:0.2, end:1.2, ease:Easing.easeOutCubic })(localTime);
  const op = clamp((localTime - 0.2) / 0.6, 0, 1);
  const zoom = 1 + 0.045 * clamp((localTime - 1.2) / 6, 0, 1);
  return (
    <SceneBox bg={A.cream}>
      <div style={{ position:'absolute', top:0, bottom:0, left:760, right:-220, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:170, left:40, width:1340, opacity:op, transform:`translateX(${slide}px) scale(${zoom})`, transformOrigin:'left center' }}>
          <Browser src="../assets/02-marketplace.webp" style={{ position:'relative', width:'100%' }} />
        </div>
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,${A.cream} 0%, rgba(250,245,236,0) 16%)` }}></div>
      </div>
      <Toast localTime={localTime} start={2.3} top={300} left={980} accent={A.orange} label="+1 demande qualifiée" sub="reçue dans votre espace" />
      <div style={{ position:'absolute', top:'50%', left:130, width:600, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>Différenciateur 2</Eyebrow>
        <h1 style={{ ...rise(localTime, 0.4, 0.7, 26), fontFamily:A.serif, fontWeight:500, fontSize:74, lineHeight:1.04, margin:'30px 0 18px' }}>
          De nouveaux apprenants qualifiés, <em style={{ color:A.teal, fontStyle:'italic' }}>sans prospecter.</em>
        </h1>
        <p style={{ ...rise(localTime, 0.7, 0.7, 22), fontFamily:A.sans, fontSize:34, lineHeight:1.4, color:'#46586b', margin:0 }}>
          Votre catalogue exposé au réseau Le Bon Rebond.
        </p>
      </div>
      <Subtitle localTime={localTime} start={0.6}>Des demandes pré-qualifiées arrivent directement</Subtitle>
    </SceneBox>
  );
}

/* ---------- S6 — confiance ---------- */
function Check({ localTime, start, children }) {
  const t = Easing.easeOutBack(clamp((localTime - start) / 0.5, 0, 1));
  return (
    <div style={{ display:'flex', alignItems:'center', gap:30, opacity:clamp(t,0,1), transform:`translateX(${(1-clamp(t,0,1))*-20}px)` }}>
      <span style={{ width:64, height:64, borderRadius:'50%', background:A.green, flex:'none', position:'relative', transform:`scale(${0.6+0.4*t})` }}>
        <span style={{ position:'absolute', left:'34%', top:'22%', width:'24%', height:'44%', border:'solid #fff', borderWidth:'0 7px 7px 0', transform:'rotate(42deg)' }}></span>
      </span>
      <span style={{ fontFamily:A.sans, fontSize:54, fontWeight:600, color:A.navy }}>{children}</span>
    </div>
  );
}
function S6() {
  const { localTime } = useSprite();
  return (
    <SceneBox bg={A.cream}>
      <div style={{ position:'absolute', top:'50%', left:200, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>Conçu pour les organismes</Eyebrow>
        <div style={{ display:'flex', flexDirection:'column', gap:40, marginTop:60 }}>
          <Check localTime={localTime} start={0.6}>Compatible Qualiopi</Check>
          <Check localTime={localTime} start={1.1}>Sans engagement</Check>
        </div>
      </div>
      <Subtitle localTime={localTime} start={0.8}>Qualiopi-ready · sans engagement</Subtitle>
    </SceneBox>
  );
}

/* ---------- S7 — CTA ---------- */
function S7() {
  const { localTime } = useSprite();
  const pulse = 1 + 0.04 * Math.max(0, Math.sin((localTime - 1.4) * 3)) * (localTime > 1.4 ? 1 : 0);
  return (
    <SceneBox bg={A.navy} color={A.cream}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:50, textAlign:'center' }}>
        <div style={rise(localTime, 0.1, 0.6, 16)}><Logo size={1.05} light center /></div>
        <h1 style={{ ...rise(localTime, 0.5, 0.7, 26), fontFamily:A.serif, fontWeight:500, fontSize:80, lineHeight:1.08, margin:0, color:A.cream, whiteSpace:'nowrap' }}>
          Créez votre espace<br/><em style={{ color:A.green, fontStyle:'italic' }}>gratuit</em> en 2 minutes.
        </h1>
        <div style={{ ...rise(localTime, 0.9, 0.6, 20), transform:`${rise(localTime,0.9,0.6,20).transform} scale(${pulse})` }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:22, background:A.orange, color:'#fff', fontFamily:A.sans, fontWeight:700, fontSize:46, padding:'30px 56px', borderRadius:999, boxShadow:'0 30px 60px -22px rgba(224,124,57,.9)' }}>
            Créez votre espace gratuit <span>→</span>
          </span>
        </div>
        <div style={{ ...rise(localTime, 1.2, 0.6, 14), fontFamily:A.sans, fontWeight:600, fontSize:32, letterSpacing:'.02em', color:A.green }}>
          lebonrebond.optiquant-ia.com
        </div>
      </div>
      <Subtitle localTime={localTime} start={1.0}>Créez votre espace gratuit dès aujourd'hui</Subtitle>
    </SceneBox>
  );
}

/* ---------- Timeline ---------- */
function VideoA() {
  // scene windows (seconds)
  const T = {
    intro:[0,3.5], s1:[3.5,9.5], s2:[9.5,15.5], s3:[15.5,25.5],
    s4:[25.5,33.5], s5:[33.5,41.5], s6:[41.5,46.5], s7:[46.5,53],
  };
  return (
    <Stage width={1920} height={1080} duration={53} background={A.cream} persistKey="lebonrebond-videoA" loop={true} controls={window.LBR_CONTROLS !== false}>
      <Sprite start={T.intro[0]} end={T.intro[1]}><Intro/></Sprite>
      <Sprite start={T.s1[0]} end={T.s1[1]}><S1/></Sprite>
      <Sprite start={T.s2[0]} end={T.s2[1]}><S2/></Sprite>
      <Sprite start={T.s3[0]} end={T.s3[1]}><S3/></Sprite>
      <Sprite start={T.s4[0]} end={T.s4[1]}><S4/></Sprite>
      <Sprite start={T.s5[0]} end={T.s5[1]}><S5/></Sprite>
      <Sprite start={T.s6[0]} end={T.s6[1]}><S6/></Sprite>
      <Sprite start={T.s7[0]} end={T.s7[1]}><S7/></Sprite>
    </Stage>
  );
}

window.VideoA = VideoA;
