/* Vidéo B — Particuliers / bilan de compétences. Plus dynamique : typo cinétique,
   parcours animé, cartes qui volent, cuts rapides. Engine globals from animations.jsx. */

const B = {
  cream:'#FAF5EC', navy:'#15314C', teal:'#2C8E86', green:'#5FB14E',
  orange:'#E07C39', paper:'#FFFFFF', blue:'#4f86c6',
  serif:"'Newsreader',Georgia,serif", sans:"'Plus Jakarta Sans',system-ui,sans-serif",
};

function useFade(fin = 0.35, fout = 0.4) {
  const { localTime, duration } = useSprite();
  if (localTime < fin) return clamp(localTime / fin, 0, 1);
  if (localTime > duration - fout) return clamp((duration - localTime) / fout, 0, 1);
  return 1;
}
function rise(localTime, start, dur = 0.5, dist = 26) {
  const t = Easing.easeOutCubic(clamp((localTime - start) / dur, 0, 1));
  return { opacity: t, transform: `translateY(${(1 - t) * dist}px)` };
}
function SceneBox({ bg, children, color }) {
  const o = useFade();
  return <div style={{ position:'absolute', inset:0, background:bg, color:color||B.navy, opacity:o, overflow:'hidden' }}>{children}</div>;
}
function Eyebrow({ children, localTime, start = 0, center, light }) {
  const s = rise(localTime, start, 0.45, 14);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:18, justifyContent:center?'center':'flex-start', ...s }}>
      <span style={{ width:64, height:5, borderRadius:3, background:B.green }}></span>
      <span style={{ fontFamily:B.sans, fontSize:27, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:light?B.green:B.teal }}>{children}</span>
    </div>
  );
}
function Subtitle({ children, localTime, start = 0.25 }) {
  const t = clamp((localTime - start) / 0.3, 0, 1);
  return (
    <div style={{ position:'absolute', left:'50%', bottom:70, transform:'translateX(-50%)', opacity:t,
      background:'rgba(21,49,76,.92)', color:'#fff', fontFamily:B.sans, fontWeight:600, fontSize:38, lineHeight:1.25,
      padding:'16px 30px', borderRadius:8, maxWidth:1520, textAlign:'center', whiteSpace:'nowrap' }}>{children}</div>
  );
}
function Logo({ size = 1, light, center }) {
  const m = 74 * size;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:24*size, justifyContent:center?'center':'flex-start' }}>
      <span style={{ width:m, height:m, borderRadius:'50%', background:`linear-gradient(135deg,${B.teal},${B.green})`, position:'relative', flex:'none' }}>
        <span style={{ position:'absolute', inset:'24%', borderRadius:'50%', background:light?B.navy:B.cream }}></span>
      </span>
      <span style={{ fontFamily:B.serif, fontWeight:600, fontSize:56*size, lineHeight:.96, color:light?B.cream:B.navy, letterSpacing:'-.01em' }}>Le Bon<br/>Rebond</span>
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
// Kinetic typography — words rise + scale in, staggered. More energetic easing.
function Kinetic({ text, localTime, start = 0, stagger = 0.07, size = 110, color = B.navy, em, weight = 500, lineHeight = 1.02, style }) {
  const words = text.split(' ');
  return (
    <h1 style={{ fontFamily:B.serif, fontWeight:weight, fontSize:size, lineHeight, letterSpacing:'-.01em', margin:0, color, ...style }}>
      {words.map((w, i) => {
        const t = Easing.easeOutBack(clamp((localTime - start - i * stagger) / 0.42, 0, 1));
        const isEm = em && em.includes(i);
        return (
          <span key={i} style={{ display:'inline-block', opacity:clamp(t,0,1), transform:`translateY(${(1-t)*30}px) scale(${0.86+0.14*Math.min(1,t)})`, marginRight:'0.26em', color:isEm?B.teal:undefined, fontStyle:isEm?'italic':'normal' }}>{w}</span>
        );
      })}
    </h1>
  );
}
// Art-directed photo placeholder: subtle stripes + warm scrim for legible overlay text.
function Photo({ localTime, label, scrim = 'left', zoomFrom = 1.12, tint = B.navy }) {
  const z = interpolate([0, 6.5], [zoomFrom, 1], Easing.easeOutCubic)(localTime);
  const scrimBg = scrim === 'left'
    ? `linear-gradient(90deg, rgba(15,28,44,.82) 0%, rgba(15,28,44,.5) 38%, rgba(15,28,44,.05) 72%)`
    : `linear-gradient(0deg, rgba(15,28,44,.78) 0%, rgba(15,28,44,.15) 55%)`;
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:'-4%', transform:`scale(${z})`,
        background:`repeating-linear-gradient(125deg, #2d4258 0 22px, #283c50 22px 44px)` }}></div>
      <div style={{ position:'absolute', inset:0, background:scrimBg }}></div>
      <span style={{ position:'absolute', bottom:30, right:34, fontFamily:'ui-monospace,Menlo,monospace', fontSize:22,
        color:'rgba(255,255,255,.62)', background:'rgba(15,28,44,.45)', padding:'8px 14px', borderRadius:8, letterSpacing:'.02em' }}>{label}</span>
    </div>
  );
}

/* ---------- INTRO ---------- */
function Intro() {
  const { localTime } = useSprite();
  const ls = rise(localTime, 0.1, 0.55, 16);
  return (
    <SceneBox bg={B.navy} color={B.cream}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:40 }}>
        <div style={ls}><Logo size={1.2} light center /></div>
        <Kinetic text="Et vous, où allez-vous ?" localTime={localTime} start={0.5} stagger={0.09} size={72} color={B.cream} em={[3,4]} style={{ textAlign:'center' }} />
      </div>
    </SceneBox>
  );
}

/* ---------- S1 — douleur (émotion) ---------- */
function S1() {
  const { localTime } = useSprite();
  return (
    <SceneBox bg={B.navy} color="#fff">
      <Photo localTime={localTime} label="PHOTO — personne 35-50 ans, à un tournant, lumineux" scrim="left" />
      <div style={{ position:'absolute', top:'50%', left:130, width:1000, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1} light>Là où vous en êtes</Eyebrow>
        <div style={{ marginTop:30 }}>
          <Kinetic text="« Je tourne en rond." localTime={localTime} start={0.4} size={104} color="#fff" stagger={0.08} />
          <Kinetic text="Je ne sais plus où je vais. »" localTime={localTime} start={1.0} size={104} color="#fff" em={[5,6,7]} stagger={0.07} />
        </div>
      </div>
      <Subtitle localTime={localTime} start={0.6}>Ce sentiment de tourner en rond… ça vous parle ?</Subtitle>
    </SceneBox>
  );
}

/* ---------- S2 — tension (trop d'offres) ---------- */
function CourseCard({ localTime, start, x, y, rot, c, title }) {
  const t = Easing.easeOutExpo(clamp((localTime - start) / 0.6, 0, 1));
  const drift = Math.sin((localTime - start) * 1.5 + x) * 4;
  return (
    <div style={{ position:'absolute', left:x, top:y + drift, width:340, transform:`rotate(${rot}deg) translateY(${(1-t)*60}px) scale(${0.7+0.3*t})`, opacity:clamp(t,0,1),
      background:B.paper, borderRadius:20, overflow:'hidden', boxShadow:'0 40px 70px -34px rgba(21,49,76,.5)', border:'1px solid rgba(21,49,76,.06)' }}>
      <div style={{ height:74, background:c }}></div>
      <div style={{ padding:'18px 22px' }}>
        <div style={{ fontFamily:B.sans, fontWeight:700, fontSize:26, color:B.navy, lineHeight:1.15 }}>{title}</div>
        <div style={{ fontFamily:B.sans, fontSize:20, color:'#8a96a3', marginTop:8 }}>Centre · CPF · 3 j</div>
      </div>
    </div>
  );
}
function S2() {
  const { localTime } = useSprite();
  const qt = Easing.easeOutBack(clamp((localTime - 2.6) / 0.6, 0, 1));
  return (
    <SceneBox bg={B.cream}>
      <CourseCard localTime={localTime} start={0.2} x={120}  y={150} rot={-7} c={B.orange} title="Finance d'entreprise" />
      <CourseCard localTime={localTime} start={0.45} x={1460} y={120} rot={6}  c={B.teal}   title="Initiation à l'IA" />
      <CourseCard localTime={localTime} start={0.7} x={1500} y={620} rot={-5} c={B.blue}   title="Power BI & data" />
      <CourseCard localTime={localTime} start={0.95} x={90}  y={650} rot={5}  c={B.green}  title="Excel avancé PME" />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <Eyebrow localTime={localTime} start={0.1} center>Le vrai problème</Eyebrow>
        <h1 style={{ fontFamily:B.serif, fontWeight:500, fontSize:230, lineHeight:.9, color:B.orange, margin:'18px 0 6px', opacity:clamp(qt,0,1), transform:`scale(${0.7+0.3*qt})` }}>+200</h1>
        <Kinetic text="formations. Laquelle est la bonne ?" localTime={localTime} start={1.6} size={76} em={[2,3,4]} stagger={0.06} style={{ textAlign:'center' }} />
      </div>
      <Subtitle localTime={localTime} start={1.8}>Trop d'offres, impossibles à comparer.</Subtitle>
    </SceneBox>
  );
}

/* ---------- S3 — révélation : le parcours ---------- */
function Step({ localTime, start, label, idx }) {
  const t = Easing.easeOutBack(clamp((localTime - start) / 0.5, 0, 1));
  const on = localTime > start + 0.2;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:22, opacity:clamp(t,0,1), transform:`scale(${0.7+0.3*t})` }}>
      <div style={{ width:120, height:120, borderRadius:'50%', background:on?B.green:'#fff', border:`3px solid ${on?B.green:'rgba(21,49,76,.15)'}`,
        display:'flex', alignItems:'center', justifyContent:'center', fontFamily:B.serif, fontSize:54, fontWeight:600, color:on?'#fff':B.navy,
        boxShadow:on?'0 24px 50px -22px rgba(95,177,78,.7)':'none', transition:'none' }}>{idx}</div>
      <div style={{ fontFamily:B.sans, fontWeight:700, fontSize:34, color:B.navy }}>{label}</div>
    </div>
  );
}
function S3() {
  const { localTime } = useSprite();
  const lineW = interpolate([1.0, 3.2], [0, 760], Easing.easeInOutCubic)(localTime);
  return (
    <SceneBox bg={B.cream}>
      <div style={{ position:'absolute', top:200, left:0, right:0, textAlign:'center' }}>
        <Eyebrow localTime={localTime} start={0.1} center>La méthode Rebond</Eyebrow>
        <h1 style={{ ...rise(localTime, 0.35, 0.6, 22), fontFamily:B.serif, fontWeight:500, fontSize:84, lineHeight:1.04, margin:'24px 0 0' }}>
          Un parcours clair, en <em style={{ color:B.teal, fontStyle:'italic' }}>3 étapes.</em>
        </h1>
      </div>
      <div style={{ position:'absolute', top:560, left:'50%', transform:'translateX(-50%)', width:900, height:6 }}>
        <div style={{ position:'absolute', top:54, left:70, width:760, height:5, background:'rgba(21,49,76,.12)', borderRadius:3 }}></div>
        <div style={{ position:'absolute', top:54, left:70, width:lineW, height:5, background:B.green, borderRadius:3 }}></div>
        <div style={{ position:'absolute', inset:0, display:'flex', justifyContent:'space-between' }}>
          <Step localTime={localTime} start={0.8} idx="1" label="Bilan" />
          <Step localTime={localTime} start={2.0} idx="2" label="Un cap clair" />
          <Step localTime={localTime} start={3.2} idx="3" label="Les bons centres" />
        </div>
      </div>
      <Subtitle localTime={localTime} start={0.6}>Bilan → un cap clair → les bons centres.</Subtitle>
    </SceneBox>
  );
}

/* ---------- S4 — diff1 : un cap, pas un catalogue ---------- */
function S4() {
  const { localTime } = useSprite();
  const slide = animate({ from:170, to:0, start:0.2, end:1.1, ease:Easing.easeOutExpo })(localTime);
  const op = clamp((localTime - 0.2) / 0.5, 0, 1);
  const zoom = 1 + 0.05 * clamp((localTime - 1.1) / 5, 0, 1);
  return (
    <SceneBox bg={B.cream}>
      <div style={{ position:'absolute', top:0, bottom:0, left:760, right:-220, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:150, left:50, width:1340, opacity:op, transform:`translateX(${slide}px) scale(${zoom})`, transformOrigin:'left center' }}>
          <Browser src="../assets/05-bilan-competences.webp" style={{ position:'relative', width:'100%' }} />
        </div>
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,${B.cream} 0%, rgba(250,245,236,0) 16%)` }}></div>
      </div>
      <div style={{ position:'absolute', top:'50%', left:130, width:620, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>Différenciateur 1</Eyebrow>
        <div style={{ marginTop:26 }}>
          <Kinetic text="Un cap clair," localTime={localTime} start={0.35} size={82} stagger={0.07} />
          <Kinetic text="pas un catalogue." localTime={localTime} start={0.8} size={82} em={[1,2]} stagger={0.07} />
        </div>
        <p style={{ ...rise(localTime, 1.4, 0.6, 18), fontFamily:B.sans, fontSize:34, lineHeight:1.4, color:'#46586b', margin:'26px 0 0' }}>
          On part de <strong style={{ color:B.navy }}>votre</strong> situation, pas d'une liste de cours.
        </p>
      </div>
      <Subtitle localTime={localTime} start={0.6}>On part de VOUS, pas d'un catalogue.</Subtitle>
    </SceneBox>
  );
}

/* ---------- S5 — diff2 : les bons centres près de chez vous (CPF) ---------- */
function Badge({ localTime, start, top, left, accent, label }) {
  const t = Easing.easeOutBack(clamp((localTime - start) / 0.5, 0, 1));
  return (
    <div style={{ position:'absolute', top, left, opacity:clamp(t,0,1), transform:`translateY(${(1-clamp(t,0,1))*20}px) scale(${0.82+0.18*t})`,
      background:B.paper, borderRadius:999, padding:'16px 28px', boxShadow:'0 36px 60px -30px rgba(21,49,76,.5)', border:'1px solid rgba(21,49,76,.07)',
      display:'flex', alignItems:'center', gap:14, fontFamily:B.sans, fontWeight:700, fontSize:28, color:B.navy }}>
      <span style={{ width:16, height:16, borderRadius:'50%', background:accent }}></span>{label}
    </div>
  );
}
function S5() {
  const { localTime } = useSprite();
  const slide = animate({ from:170, to:0, start:0.2, end:1.1, ease:Easing.easeOutExpo })(localTime);
  const op = clamp((localTime - 0.2) / 0.5, 0, 1);
  const zoom = 1 + 0.05 * clamp((localTime - 1.1) / 6, 0, 1);
  return (
    <SceneBox bg={B.cream}>
      <div style={{ position:'absolute', top:0, bottom:0, left:760, right:-220, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:160, left:40, width:1340, opacity:op, transform:`translateX(${slide}px) scale(${zoom})`, transformOrigin:'left center' }}>
          <Browser src="../assets/02-marketplace.webp" style={{ position:'relative', width:'100%' }} />
        </div>
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,${B.cream} 0%, rgba(250,245,236,0) 16%)` }}></div>
      </div>
      <Badge localTime={localTime} start={2.2} top={250} left={980} accent={B.green} label="Certifié Qualiopi" />
      <Badge localTime={localTime} start={2.8} top={360} left={1180} accent={B.orange} label="Finançable CPF" />
      <div style={{ position:'absolute', top:'50%', left:130, width:620, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>Différenciateur 2</Eyebrow>
        <div style={{ marginTop:26 }}>
          <Kinetic text="Les bons centres," localTime={localTime} start={0.35} size={78} stagger={0.07} />
          <Kinetic text="près de chez vous." localTime={localTime} start={0.85} size={78} em={[1,2,3]} stagger={0.07} />
        </div>
        <p style={{ ...rise(localTime, 1.4, 0.6, 18), fontFamily:B.sans, fontSize:34, lineHeight:1.4, color:'#46586b', margin:'26px 0 0' }}>
          Organismes certifiés, finançables CPF.
        </p>
      </div>
      <Subtitle localTime={localTime} start={0.6}>Des organismes certifiés, finançables CPF.</Subtitle>
    </SceneBox>
  );
}

/* ---------- S6 — confiance ---------- */
function Check({ localTime, start, children }) {
  const t = Easing.easeOutBack(clamp((localTime - start) / 0.45, 0, 1));
  return (
    <div style={{ display:'flex', alignItems:'center', gap:28, opacity:clamp(t,0,1), transform:`translateX(${(1-clamp(t,0,1))*-18}px)` }}>
      <span style={{ width:60, height:60, borderRadius:'50%', background:B.green, flex:'none', position:'relative', transform:`scale(${0.6+0.4*t})` }}>
        <span style={{ position:'absolute', left:'34%', top:'22%', width:'24%', height:'44%', border:'solid #fff', borderWidth:'0 6px 6px 0', transform:'rotate(42deg)' }}></span>
      </span>
      <span style={{ fontFamily:B.sans, fontSize:50, fontWeight:600, color:B.navy }}>{children}</span>
    </div>
  );
}
function S6() {
  const { localTime } = useSprite();
  return (
    <SceneBox bg={B.cream}>
      <div style={{ position:'absolute', top:'50%', left:240, transform:'translateY(-50%)' }}>
        <Eyebrow localTime={localTime} start={0.1}>Pourquoi nous faire confiance</Eyebrow>
        <div style={{ display:'flex', flexDirection:'column', gap:36, marginTop:54 }}>
          <Check localTime={localTime} start={0.5}>Organismes certifiés</Check>
          <Check localTime={localTime} start={0.9}>Finançable CPF</Check>
          <Check localTime={localTime} start={1.3}>Accompagnement humain</Check>
        </div>
      </div>
      <Subtitle localTime={localTime} start={0.7}>Certifiés · CPF · accompagnement humain</Subtitle>
    </SceneBox>
  );
}

/* ---------- S7 — CTA ---------- */
function S7() {
  const { localTime } = useSprite();
  const pulse = 1 + 0.045 * Math.max(0, Math.sin((localTime - 1.3) * 3.2)) * (localTime > 1.3 ? 1 : 0);
  return (
    <SceneBox bg={B.navy} color={B.cream}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:46, textAlign:'center' }}>
        <div style={rise(localTime, 0.1, 0.5, 14)}><Logo size={1.05} light center /></div>
        <Kinetic text="Faites le point sur votre avenir." localTime={localTime} start={0.4} size={92} color={B.cream} em={[3,4,5]} stagger={0.06} style={{ whiteSpace:'nowrap' }} />
        <div style={{ ...rise(localTime, 0.9, 0.5, 18), transform:`${rise(localTime,0.9,0.5,18).transform} scale(${pulse})` }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:22, background:B.orange, color:'#fff', fontFamily:B.sans, fontWeight:700, fontSize:46, padding:'30px 56px', borderRadius:999, boxShadow:'0 30px 60px -22px rgba(224,124,57,.9)' }}>
            Commencer mon bilan <span>→</span>
          </span>
        </div>
        <div style={{ ...rise(localTime, 1.2, 0.5, 12), fontFamily:B.sans, fontWeight:600, fontSize:32, letterSpacing:'.02em', color:B.green }}>lebonrebond.optiquant-ia.com</div>
      </div>
      <Subtitle localTime={localTime} start={1.0}>Faites le point sur votre avenir, dès aujourd'hui.</Subtitle>
    </SceneBox>
  );
}

/* ---------- Timeline ---------- */
function VideoB() {
  const T = {
    intro:[0,3], s1:[3,8.5], s2:[8.5,14.5], s3:[14.5,22.5],
    s4:[22.5,29.5], s5:[29.5,37], s6:[37,42], s7:[42,48],
  };
  return (
    <Stage width={1920} height={1080} duration={48} background={B.cream} persistKey="lebonrebond-videoB" loop={true} controls={window.LBR_CONTROLS !== false}>
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

window.VideoB = VideoB;
