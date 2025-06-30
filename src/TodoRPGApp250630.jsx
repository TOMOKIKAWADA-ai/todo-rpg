import React, { useReducer, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const ACT = { ADD_BLOCK: "add_block", ADD_TASK: "add_task", COMPLETE: "complete", REMOVE: "remove" };

const load = () => {
  try {
    return JSON.parse(localStorage.getItem("todoRPG")) ?? { blocks: [] };
  } catch {
    return { blocks: [] };
  }
};
const save = (s) => localStorage.setItem("todoRPG", JSON.stringify(s));

function reducer(state, a) {
  switch (a.type) {
    case ACT.ADD_BLOCK: {
      const tasks = a.tasks.map((t) => ({ id: crypto.randomUUID(), text: t, done: false }));
      return {
        ...state,
        blocks: [
          ...state.blocks,
          { id: crypto.randomUUID(), tasks, hp: tasks.length, max: tasks.length, completed: false },
        ],
      };
    }
    case ACT.ADD_TASK: {
      const bs = state.blocks.slice();
      const b = bs.at(-1);
      if (!b || b.completed) return state;
      b.tasks.push({ id: crypto.randomUUID(), text: a.text.trim(), done: false });
      b.hp += 1;
      b.max += 1;
      return { ...state, blocks: bs };
    }
    case ACT.COMPLETE: {
      const bs = state.blocks.map((b) =>
        b.id !== a.bid
          ? b
          : {
              ...b,
              tasks: b.tasks.map((t) => (t.id === a.tid ? { ...t, done: true } : t)),
              hp: b.hp - 1,
              completed: b.hp - 1 === 0,
            }
      );
      return { ...state, blocks: bs };
    }
    case ACT.REMOVE:
      return { ...state, blocks: state.blocks.filter((b) => b.id !== a.bid) };
    default:
      return state;
  }
}
export default function TodoRPGApp() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [text, setText] = useState("");

  const [pressingId, setPressingId] = useState(null);
  const [phase, setPhase] = useState("none");
  const timers = useRef({});

  const [slashes, setSlashes] = useState([]); // {id,bid}
  const [popups, setPopups] = useState([]);   // {id,bid}
  const [hit, setHit] = useState(null);       // {bid}
  const [blast, setBlast] = useState([]);     // {id,bid}
  const enemyRefs = useRef({});
  const completedOnce = useRef(new Set(state.blocks.filter(b => b.completed).map(b => b.id)));

  useEffect(() => save(state), [state]);

  useEffect(() => {
    state.blocks.forEach((b) => {
      if (b.completed && !completedOnce.current.has(b.id)) {
        completedOnce.current.add(b.id);
        const el = enemyRefs.current[b.id];
        if (el) {
          const r = el.getBoundingClientRect();
          confetti({
            particleCount: 32,
            spread: 65,
            startVelocity: 25,
            origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
            colors: ["#ffffff", "#eeeeee"],
          });
        }
      }
    });
  }, [state.blocks]);

  const active = [...state.blocks].reverse().find((b) => !b.completed) ?? null;

  const addTasks = () => {
    const parts = text.trim().split(/[\s\n]+/).filter(Boolean);
    if (!parts.length) return;
    if (!active) dispatch({ type: ACT.ADD_BLOCK, tasks: parts });
    else parts.forEach((t) => dispatch({ type: ACT.ADD_TASK, text: t }));
    setText("");
  };

  const finish = (bid, task) => {
    dispatch({ type: ACT.COMPLETE, bid, tid: task.id });
    const id = crypto.randomUUID();
    setTimeout(() => setHit({ bid }), 100);  // ← 100ms の猶予
    setTimeout(() => setHit(null), 400);
    setSlashes((s) => [...s, { id, bid }]);
    setTimeout(() => setSlashes((s) => s.filter((x) => x.id !== id)), 800);
    setPopups((p) => [...p, { id, bid }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 1100);
    setBlast((b) => [...b, { id, bid }]);
    setTimeout(() => setBlast((b) => b.filter((x) => x.id !== id)), 400);
  };

  const pressStart = (bid, task) => {
    setPressingId(task.id);
    setPhase("soft");
    timers.current.soft = setTimeout(() => setPhase("hard"), 300);
    timers.current.done = setTimeout(() => {
      finish(bid, task);
      pressEnd();
    }, 700);
  };

  const pressEnd = () => {
    clearTimeout(timers.current.soft);
    clearTimeout(timers.current.done);
    setPressingId(null);
    setPhase("none");
  };

  const iconSrc = (b) => {
    if (b.completed) return "down_01c_1.png";
    if (hit && hit.bid === b.id) return "hit_01c_1.png";
    return "stand_01c_1.png";
  };
  return (
    <div className="min-h-screen w-screen flex justify-center bg-gradient-to-br from-pink-500 via-red-300 to-yellow-100 py-10 text-[95%]">
      <main className="w-full max-w-lg text-white">
        <h1 className="text-4xl font-bold text-center mb-6">Todo RPG ⚔️</h1>

        {/* 入力フォーム（縮小） */}
        <div className="bg-white/90 rounded-xl p-3 shadow mb-8">
          <textarea
            rows={2}
            className="w-full p-2 bg-white text-gray-800 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none text-[95%]"
            placeholder="スペース・改行でタスクを入力..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="mt-2 w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
            onClick={addTasks}
          >
            追加
          </button>
        </div>

        {/* ブロック表示 */}
        {[...state.blocks].reverse().map((b) => (
          <section
            key={b.id}
            className={`relative bg-white/90 rounded-xl p-4 shadow-xl text-gray-800 mb-6 ${b.completed && "opacity-60 grayscale"}`}
          >
            <button
              className="absolute top-1 right-2 text-xl text-gray-500 hover:text-red-500"
              onClick={() => dispatch({ type: ACT.REMOVE, bid: b.id })}
            >
              ×
            </button>

            {/* HPバーと敵（順番を逆に） */}
            <div className="relative flex flex-col items-center mb-4">
              <span className="font-mono text-lg">
                {"❤️".repeat(b.hp) + "🖤".repeat(b.max - b.hp)}
              </span>

              <div className="relative" ref={(el) => (enemyRefs.current[b.id] = el)}>
                <img
                  src={iconSrc(b)}
                  alt=""
                  className={`w-52 h-52 object-contain ${hit && hit.bid === b.id ? "animate-hitShake" : ""}`}
                />
                {blast.filter((x) => x.bid === b.id).map((x) => (
                  <span
                    key={x.id}
                    className="absolute top-1/2 left-1/2 w-6 h-6 bg-yellow-300 rounded-full opacity-70 animate-blast translate-x-[-50%] translate-y-[-50%]"
                  />
                ))}
              </div>

              {slashes.filter((s) => s.bid === b.id).map((s) => (
                <span key={s.id} className="slash-line animate-slash" />
              ))}
              {popups.filter((p) => p.bid === b.id).map((p) => (
                <span key={p.id} className="dmg-popup animate-dmg">-1</span>
              ))}
            </div>

            {/* タスク：2カラムに変更 */}
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence initial={false}>
                {b.tasks.map((t) => {
                  const shake =
                    pressingId === t.id
                      ? phase === "soft"
                        ? "animate-shakeSoft"
                        : "animate-shakeHard"
                      : "";
                  return (
                    <motion.li
                      key={t.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      whileTap={{ scale: 0.96 }}
                      className={`list-none p-3 rounded-lg shadow ${
                        t.done
                          ? "bg-gray-300 line-through text-gray-600"
                          : "bg-white text-gray-800 cursor-pointer"
                      } ${shake}`}
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
          </section>
        ))}
      </main>

      {/* カスタムアニメーション用 CSS */}
      <style>{`
        .slash-line {
          position: absolute;
          width: 120%;
          height: 4px;
          left: -25%;
          top: 25%;
          background: linear-gradient(90deg, transparent 10%, rgba(255,255,255,.95) 50%, transparent 90%);
          border-radius: 9999px;
          box-shadow: 0 0 6px 2px rgba(255,255,255,.5);
          transform-origin: 0 0;
          pointer-events: none;
        }
        @keyframes slash {
          0% { transform: rotate(10deg) translate(0,0); }
          40%,80% { transform: rotate(10deg) translate(50%,50%); }
          100% { transform: rotate(10deg) translate(100%,100%); opacity: 0; }
        }
        .animate-slash { animation: slash 0.8s cubic-bezier(.4,0,.2,1) forwards; }

        .dmg-popup {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          color: #facc15;
          font-weight: bold;
        }
        @keyframes dmg {
          0% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -32px); opacity: 0; }
        }
        .animate-dmg { animation: dmg 0.6s ease-out forwards; }

        @keyframes shakeSoft {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, 2px); }
        }
        .animate-shakeSoft { animation: shakeSoft 0.5s linear infinite; }

        @keyframes shakeHard {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(3px, -3px); }
          75% { transform: translate(-3px, 3px); }
        }
        .animate-shakeHard { animation: shakeHard 0.25s linear infinite; }

        @keyframes hitShake {
          0%,100%{ transform:translate(0);}
          20%{ transform:translate(1px,-1px);}
          40%{ transform:translate(-1px,1px);}
          60%{ transform:translate(1px,1px);}
          80%{ transform:translate(-1px,-1px);}
        }
        .animate-hitShake { animation: hitShake .3s linear infinite; }

        @keyframes blast {
          0% { opacity: 0.7; transform: scale(1); }
          100% { opacity: 0; transform: scale(2); }
        }
        .animate-blast { animation: blast 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
