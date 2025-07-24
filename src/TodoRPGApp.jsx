// TodoRPGApp.jsx  — Part 1 / 4
import React, { useReducer, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import SpeechBubble from "./SpeechBubble.jsx";

const ACT = { ADD_BLOCK: "add_block", ADD_TASK: "add_task", COMPLETE: "complete", REMOVE: "remove" };

const CHARACTERS = ["A_01", "B_01", "C_01"];
const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem("todoRPG")) ?? { blocks: [] };
    if (s.blocks) {
      s.blocks.forEach(b => {
        if (!b.charId) b.charId = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      });
    }
    return s;
  } catch {
    return { blocks: [] };
  }
};
const save  = (s) => localStorage.setItem("todoRPG", JSON.stringify(s));

function reducer(state, a) {
  switch (a.type) {
    case ACT.ADD_BLOCK: {
      const tasks = a.tasks.map(t => ({ id: crypto.randomUUID(), text: t, done: false }));
      const charId = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      return { ...state, blocks: [...state.blocks,
        { id: crypto.randomUUID(), title: a.title, tasks, hp: tasks.length, max: tasks.length, completed: tasks.length === 0, charId }],
      };
    }
    case ACT.ADD_TASK: {
      const bs = state.blocks.map(b => {
        if (b.id !== a.bid) return b;
        const tasks = a.tasks.map(t => ({ id: crypto.randomUUID(), text: t, done: false }));
        return { ...b, tasks: [...b.tasks, ...tasks], hp: b.hp + tasks.length, max: b.max + tasks.length };
      });
      return { ...state, blocks: bs };
    }
    case ACT.COMPLETE: {
      const bs = state.blocks.map(b =>
        b.id !== a.bid ? b : {
          ...b,
          tasks: b.tasks.map(t => (t.id === a.tid ? { ...t, done: true } : t)),
          hp: b.hp - 1,
          completed: b.hp - 1 === 0,
        });
      return { ...state, blocks: bs };
    }
    case ACT.REMOVE:
      return { ...state, blocks: state.blocks.filter(b => b.id !== a.bid) };
    default:
      return state;
  }
}
// TodoRPGApp.jsx  — Part 2 / 4
export default function TodoRPGApp() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [headerText, setHeaderText] = useState("");

  /* long-press & エフェクト */
  const [pressingId, setPressingId] = useState(null);
  const [phase, setPhase]   = useState("none");
  const timers = useRef({});

  const [slashes, setSlashes] = useState([]);
  const [popups,  setPopups]  = useState([]);
  const [hit, setHit]        = useState(null);
  const [blast, setBlast]    = useState([]);

  /* ブロック追加フォーム */
  const [addingBid, setAddingBid]     = useState(null);
  const [blockInputs, setBlockInputs] = useState({});

  const enemyRefs     = useRef({});
  const completedOnce = useRef(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => save(state), [state]);

  /* 紙吹雪 (初回ロード無効) */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      completedOnce.current = new Set(state.blocks.filter(b => b.completed).map(b => b.id));
      return;
    }
    state.blocks.forEach(b => {
      if (b.completed && !completedOnce.current.has(b.id)) {
        completedOnce.current.add(b.id);
        const el = enemyRefs.current[b.id];
        if (el) {
          const r = el.getBoundingClientRect();
          confetti({
            particleCount: 32, spread: 70, startVelocity: 25,
            origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
            colors: ["#ffffff", "#eeeeee"],
          });
        }
      }
    });
  }, [state.blocks]);

  /* 文字列をスペース/改行で分割 → 配列 */
  const splitParts = (str) => str.trim().split(/[ \u3000\r?\n]+/).filter(Boolean);

  const addBlockFromHeader = () => {
    const all_parts = splitParts(headerText);
    if (!all_parts.length) return;

    const title_parts = all_parts.filter(p => p.startsWith("##"));
    const task_parts = all_parts.filter(p => !p.startsWith("##"));

    const title = title_parts.map(p => p.substring(2)).join(" ");

    dispatch({ type: ACT.ADD_BLOCK, title: title, tasks: task_parts });
    setHeaderText("");
  };

  const confirmAddToBlock = (bid) => {
    const parts = splitParts(blockInputs[bid] ?? "");
    if (!parts.length) return;
    dispatch({ type: ACT.ADD_TASK, bid, tasks: parts });
    setBlockInputs((inp) => ({ ...inp, [bid]: "" }));
    setAddingBid(null);
  };
// TodoRPGApp.jsx  — Part 3 / 4
  /* タスク完了 (長押し) */
  const finish = (bid, task) => {
    dispatch({ type: ACT.COMPLETE, bid, tid: task.id });
    const id = crypto.randomUUID();

    setTimeout(() => setHit({ bid }), 100);
    setTimeout(() => setHit(null), 400);

    setSlashes(s => [...s, { id, bid }]);
    setTimeout(() => setSlashes(s => s.filter(x => x.id !== id)), 800);

    setPopups(p => [...p, { id, bid }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), 1100);

    setBlast(b => [...b, { id, bid }]);
    setTimeout(() => setBlast(b => b.filter(x => x.id !== id)), 400);
  };

  const pressStart = (bid, task) => {
    setPressingId(task.id);
    setPhase("soft");
    timers.current.soft = setTimeout(() => setPhase("hard"), 300);
    timers.current.done = setTimeout(() => { finish(bid, task); pressEnd(); }, 700);
  };
  const pressEnd = () => {
    clearTimeout(timers.current.soft); clearTimeout(timers.current.done);
    setPressingId(null); setPhase("none");
  };

  const iconSrc = b => {
    // public/stand_ID.png, public/hit_ID.png, public/down_ID.png のように、対応する画像ファイルが必要です。
    // 利用可能なキャラクターIDは、コード上部の CHARACTERS 定数で定義します。例: ["A_01", "B_01"]
    const char = b.charId ?? "A_01"; // 古いデータ用のフォールバック
    if (b.completed) return `down_${char}.png`;
    if (hit && hit.bid === b.id) return `hit_${char}.png`;
    return `stand_${char}.png`;
  };

  const bubbleText = b => {
    const char = b.charId ?? "A_01";
    const lines = {
      A_01: { hit: "きゃっ！", done: "参りました…", low: "あと一つです…！", default: `あと${b.hp}つ \n です` },
      B_01: { hit: "ぐわっ！", done: "ぐぬぬ…",       low: "あと1発だと…！？", default: `あと${b.hp}だ` },
      C_01: { hit: "ひゃん！", done: "やられた…",     low: "もうダメかも…",   default: `のこり${b.hp}です` },
    };
    const set = lines[char] || lines.A_01;
    if (hit && hit.bid === b.id) return set.hit;
    if (b.completed) return set.done;
    if (b.hp === 1) return set.low;
    return set.default;
  };
// TodoRPGApp.jsx  — Part 4 / 4
  return (
    <div className="min-h-screen w-screen flex justify-center bg-gradient-to-br from-pink-500 via-red-300 to-yellow-100 py-10 text-[95%]">
      <main className="w-full max-w-lg text-white">
        <h1 className="text-4xl font-bold text-center mb-6">Todo RPG ⚔️</h1>

        {/* 新ブロックフォーム */}
        <div className="bg-white/90 rounded-xl p-3 shadow mb-8">
          <textarea
            rows={2}
            className="w-full p-2 bg-white text-gray-800 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            placeholder="スペース・改行でタスクを入力..."
            value={headerText}
            onChange={e => setHeaderText(e.target.value)}
          />
          <button
            className="mt-2 w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
            onClick={addBlockFromHeader}
          >
            追加（新ブロック）
          </button>
        </div>

        {/* ブロック一覧 */}
        {[...state.blocks].reverse().map(b => (
          <section key={b.id} className={`relative bg-white/90 rounded-xl p-4 shadow-xl text-gray-800 mb-6 ${b.completed && "opacity-60 grayscale"}`}>
            <button className="absolute top-1 right-2 text-xl text-gray-500 hover:text-red-500" onClick={() => dispatch({ type: ACT.REMOVE, bid: b.id })}>×</button>

            {b.title && <h2 className="text-xl font-bold mb-2 text-center">{b.title}</h2>}

            {/* HP & enemy */}
            <div className="relative flex flex-col items-center mb-4">
              <span className="font-mono text-lg">{"❤️".repeat(b.hp) + "🖤".repeat(b.max - b.hp)}</span>

              <div className="relative" ref={el => (enemyRefs.current[b.id] = el)}>
                {/* ▼ 吹き出しの表示位置を調整 ▼ */}
                {/* top: 上下位置 (負の値が大きいほど上) */}
                {/* left: 左右位置 (負の値が大きいほど左) */}
                <SpeechBubble text={bubbleText(b)} size={140} className="absolute top-[-10px] left-[-100px]" />

                <img src={iconSrc(b)} alt="" className={`w-44 h-44 object-contain ${hit && hit.bid === b.id ? "animate-hitShake" : ""}`} />

                {blast.filter(x => x.bid === b.id).map(x => (
                  <span key={x.id} className="absolute top-1/2 left-1/2 w-5 h-5 bg-yellow-300 rounded-full opacity-70 animate-blast translate-x-[-50%] translate-y-[-50%]" />
                ))}
              </div>

              {slashes.filter(s => s.bid === b.id).map(s => <span key={s.id} className="slash-line animate-slash" />)}
              {popups.filter(p => p.bid === b.id).map(p => <span key={p.id} className="dmg-popup animate-dmg">-1</span>)}
            </div>

            {/* タスク */}
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence initial={false}>
                {b.tasks.map(t => {
                  const shake = pressingId === t.id ? (phase === "soft" ? "animate-shakeSoft" : "animate-shakeHard") : "";
                  return (
                    <motion.li key={t.id}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} whileTap={{ scale: 0.96 }}
                      className={`list-none p-3 rounded-lg shadow ${t.done ? "bg-gray-300 line-through text-gray-600" : "bg-white text-gray-800 cursor-pointer"} ${shake}`}
                      onPointerDown={() => !t.done && pressStart(b.id, t)}
                      onPointerUp={pressEnd}
                      onPointerLeave={pressEnd}
                    >
                      {t.text}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ＋ボタン & インラインフォーム */}
            {addingBid === b.id ? (
              <div className="mt-4 bg-white/90 p-3 rounded-lg shadow">
                <textarea
                  rows={2}
                  className="w-full p-2 bg-white border rounded-md resize-none text-sm text-gray-800"
                  placeholder="スペース・改行でタスクを入力..."
                  value={blockInputs[b.id] ?? ""}
                  onChange={e => setBlockInputs(inp => ({ ...inp, [b.id]: e.target.value }))}
                />
                <button className="mt-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm" onClick={() => confirmAddToBlock(b.id)}>
                  追加
                </button>
                <button className="mt-1 ml-2 px-2 py-1 text-sm text-gray-600" onClick={() => setAddingBid(null)}>
                  キャンセル
                </button>
              </div>
            ) : (
              !b.completed && (
                <button className="mt-4 w-8 h-8 flex items-center justify-center bg-purple-500 text-white rounded-full text-lg" onClick={() => setAddingBid(b.id)}>
                  ＋
                </button>
              )
            )}
          </section>
        ))}
      </main>

      {/* CSS（slash / dmg / shake / blast） */}
      <style>{`
        .slash-line{position:absolute;width:120%;height:4px;left:-25%;top:25%;background:linear-gradient(90deg,transparent 10%,rgba(255,255,255,.95) 50%,transparent 90%);border-radius:9999px;box-shadow:0 0 6px 2px rgba(255,255,255,.5);transform-origin:0 0;pointer-events:none;}
        @keyframes slash{0%{transform:rotate(10deg) translate(0,0);}40%,80%{transform:rotate(10deg) translate(50%,50%);}100%{transform:rotate(10deg) translate(100%,100%);opacity:0;}}
        .animate-slash{animation:slash .8s cubic-bezier(.4,0,.2,1) forwards;}

        .dmg-popup{position:absolute;top:-28px;left:50%;transform:translateX(-50%);color:#facc15;font-weight:bold;}
        @keyframes dmg{0%{transform:translate(-50%,0);opacity:1;}100%{transform:translate(-50%,-32px);opacity:0;}}
        .animate-dmg{animation:dmg .6s ease-out forwards;}

        @keyframes shakeSoft{0%,100%{transform:translate(0);}25%{transform:translate(2px,-2px);}75%{transform:translate(-2px,2px);}}
        .animate-shakeSoft{animation:shakeSoft .5s linear infinite;}
        @keyframes shakeHard{0%,100%{transform:translate(0);}25%{transform:translate(3px,-3px);}75%{transform:translate(-3px,3px);}}
        .animate-shakeHard{animation:shakeHard .25s linear infinite;}

        @keyframes hitShake{0%,100%{transform:translate(0);}20%{transform:translate(1px,-1px);}40%{transform:translate(-1px,1px);}60%{transform:translate(1px,1px);}80%{transform:translate(-1px,-1px);}}
        .animate-hitShake{animation:hitShake .3s linear infinite;}

        @keyframes blast{0%{opacity:.7;transform:scale(1);}100%{opacity:0;transform:scale(2);}}
        .animate-blast{animation:blast .4s ease-out forwards;}
      `}</style>
    </div>
  );
}