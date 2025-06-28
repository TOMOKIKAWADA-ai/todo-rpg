// TodoRPGApp.jsx – RPG風 Todo アプリ v14i (前半)
// -------------------------------------------------
// インポート＆定数定義、reducer、ヘルパー、state 管理など
// -------------------------------------------------
import React, { useReducer, useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

// テストツールを CommonJS require で先頭に移動
let render, screen;
try {
  ({ render, screen } = require("@testing-library/react"));
} catch {}

// 定数
const ACTIONS = {
  ADD: "add",
  TOGGLE: "toggle",
  DAMAGE: "damage",
  RESET_ENEMY: "reset_enemy",
};
const INITIAL_HP = 60;
const DAMAGE_PER_TASK = 20;
const ENEMY_EMOJIS = ["👾", "😈", "👹", "💀", "🐲", "👑"];
const FRAG_COUNT = 20;

// reducer
const initialState = { todos: [], enemyHP: INITIAL_HP, level: 1 };
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD:
      return {
        ...state,
        todos: [
          ...state.todos,
          { id: crypto.randomUUID(), text: action.payload.trim(), done: false },
        ],
      };
    case ACTIONS.TOGGLE:
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t
        ),
      };
    case ACTIONS.DAMAGE:
      return state.enemyHP === 0
        ? state
        : { ...state, enemyHP: Math.max(state.enemyHP - action.amount, 0) };
    case ACTIONS.RESET_ENEMY:
      return { ...state, enemyHP: INITIAL_HP, level: state.level + 1 };
    default:
      return state;
  }
}

// メインコンポーネント（前半）
export default function TodoRPGApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [text, setText] = useState("");
  const [slashes, setSlashes] = useState([]);
  const [popups, setPopups] = useState([]);
  const [isHit, setIsHit] = useState(false);
  const [phase, setPhase] = useState("alive"); // alive | explosion | frag
  const [frags, setFrags] = useState([]);
  const defeatedRef = useRef(false);

  const [pressingId, setPressingId] = useState(null);
  const [pressPhase, setPressPhase] = useState("none");
  const lastCompletedId = useRef(null);
  const timers = useRef({});

  const { todos, enemyHP, level } = state;

  // タスク追加
  const addTodo = () => {
    const raw = text.trim();
    if (!raw) return;
    raw.split(/\s+/).filter(Boolean).forEach((t) =>
      dispatch({ type: ACTIONS.ADD, payload: t })
    );
    setText("");
  };

  // 攻撃処理
  const attack = (todoId) => {
    dispatch({ type: ACTIONS.DAMAGE, amount: DAMAGE_PER_TASK });
    dispatch({ type: ACTIONS.TOGGLE, id: todoId });
    lastCompletedId.current = todoId;
    setIsHit(true);
    setTimeout(() => setIsHit(false), 300);

    const id = Date.now() + Math.random();
    setSlashes((s) => [...s, id]);
    setTimeout(() => setSlashes((s) => s.filter((x) => x !== id)), 300);

    setPopups((p) => [...p, { id, dmg: DAMAGE_PER_TASK }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  };

  // 長押し開始／キャンセル
  const pressStart = (todo) => {
    if (todo.done) return;
    setPressingId(todo.id);
    setPressPhase("soft");
    timers.current.shakeTimer = setTimeout(() => setPressPhase("hard"), 1000);
    timers.current.completeTimer = setTimeout(() => {
      setPressingId(null);
      setPressPhase("none");
      attack(todo.id);
    }, 2000);
  };
  const pressEnd = () => {
    clearTimeout(timers.current.shakeTimer);
    clearTimeout(timers.current.completeTimer);
    setPressingId(null);
    setPressPhase("none");
  };

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  // 敵撃破ロジック
  useEffect(() => {
    if (enemyHP === 0 && !defeatedRef.current) {
      defeatedRef.current = true;
      setPhase("explosion");
      confetti({
        particleCount: 20,
        spread: 70,
        startVelocity: 25,
        scalar: 0.8,
        shapes: ["circle"],
        colors: ["#eeeeee", "#dddddd", "#cccccc"],
      });
      setTimeout(() => {
        const arr = Array.from({ length: FRAG_COUNT }, () => ({
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 1) * 120 - 20,
          rot: (Math.random() - 0.5) * 40,
          delay: Math.random() * 0.15,
        }));
        setFrags(arr);
        setPhase("frag");
      }, 250);
      setTimeout(() => {
        setFrags([]);
        setPhase("alive");
        dispatch({ type: ACTIONS.RESET_ENEMY });
        defeatedRef.current = false;
      }, 1500);
    }
  }, [enemyHP]);

  // renderEnemy 関数
  const renderEnemy = () => {
    if (phase === "explosion") return <span className="explosion" />;
    if (phase === "frag")
      return frags.map((f, i) => (
        <span
          key={i}
          className="enemy-frag"
          style={{
            "--tx": `${f.x}px`,
            "--ty": `${f.y}px`,
            "--rot": `${f.rot}deg`,
            "--delay": `${f.delay}s`,
          }}
        >
          ●
        </span>
      ));
    return (
      <span
        className={`text-6xl md:text-7xl transition-transform duration-75 ${
          isHit ? "scale-90" : "scale-100"
        }`}
      >
        {enemyEmoji}
      </span>
    );
  };

// (続きは次のメッセージで 2/2)  
  // JSX部分（続き）
  return (
    <main className="min-h-screen flex flex-col items-center py-10 bg-gradient-to-br from-purple-700 via-red-500 to-yellow-500 text-white select-none">
      <h1 className="text-4xl md:text-5xl font-bold drop-shadow mb-6">
        Todo RPG ⚔️ – Lv.{level}
      </h1>

      {/* 敵キャラ表示 */}
      <div
        className="relative flex flex-col items-center mb-8"
        style={{ height: "6.5rem", width: "8rem" }}
      >
        {slashes.map((id) => (
          <span key={id} className="slash-line animate-slashLine" />
        ))}
        {popups.map(({ id, dmg }) => (
          <span key={id} className="absolute -top-6 text-yellow-300 font-bold text-lg animate-dmg">
            -{dmg}
          </span>
        ))}
        {renderEnemy()}
      </div>

      {/* HPバー */}
      <div className="w-64 h-6 bg-gray-800 rounded-full overflow-hidden shadow-inner mb-1">
        <motion.div
          className="h-full bg-green-500"
          animate={{ width: `${hpPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className="mb-6 text-sm font-mono">
        HP: {enemyHP} / {INITIAL_HP}
      </span>

      {/* タスク入力＆リスト */}
      <section className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl p-6 shadow-xl text-gray-800">
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="スペース区切りでタスクを入力..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
          />
          <button
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg active:scale-95"
            onClick={addTodo}
          >
            追加
          </button>
        </div>

        <AnimatePresence initial={false}>
          {todos.map((todo) => {
            const isPressing = pressingId === todo.id;
            const shakeClass = isPressing
              ? pressPhase === "soft"
                ? "animate-shakeSoft"
                : "animate-shakeHard"
              : "";
            const doneClass = todo.done
              ? "bg-gray-300 line-through text-gray-600"
              : "bg-white text-gray-800";
            return (
              <motion.li
                key={todo.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                whileTap={{ scale: 0.96 }}
                className={`mb-2 rounded-lg p-3 shadow hover:shadow-md flex items-center cursor-pointer select-none ${shakeClass} ${doneClass}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!todo.done) pressStart(todo);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  if (lastCompletedId.current === todo.id) {
                    lastCompletedId.current = null;
                    return;
                  }
                  if (!todo.done) pressEnd();
                  else dispatch({ type: ACTIONS.TOGGLE, id: todo.id });
                }}
                onPointerLeave={pressEnd}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span>{todo.text}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </section>

      {/* インラインスタイル定義 */}
      <style>{`
        /* slash effect */
        .slash-line {
          position: absolute;
          width: 160px;
          height: 4px;
          left: -80px;
          top: 0;
          background: linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.95) 50%, transparent 90%);
          border-radius: 9999px;
          box-shadow: 0 0 6px 2px rgba(255,255,255,0.5);
          transform: rotate(45deg);
          pointer-events: none;
        }
        @keyframes slashLine {
          0% { transform: rotate(45deg) translate(-90px,-90px) scale(0.8); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: rotate(45deg) translate(90px,90px) scale(1.1); opacity: 0; }
        }
        .animate-slashLine { animation: slashLine 0.3s cubic-bezier(.4,0,.2,1) forwards; }

        /* damage popup */
        @keyframes dmg {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-42px); opacity: 0; }
        }
        .animate-dmg { animation: dmg 0.9s ease-out forwards; }

        /* explosion flash */
        .explosion {
          position: absolute; top: 50%; left: 50%;
          width: 120px; height: 120px; margin: -60px 0 0 -60px;
          border-radius: 50%;
          background: radial-gradient(circle, #fff 0%, #fff8d0 40%, rgba(255,236,184,0.6) 60%, transparent 80%);
          filter: blur(2px);
          animation: boom 0.5s ease-out forwards;
        }
        @keyframes boom {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        /* fragments */
        .enemy-frag {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%); font-size: 3.5rem; color: #333;
          animation: frag 1.2s ease-out forwards; animation-delay: var(--delay);
        }
        @keyframes frag {
          0% { transform: translate(-50%,-50%) rotate(0) scale(1); opacity:1; }
          100% { transform: translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.5); opacity:0; filter: blur(2px); }
        }

        /* shake */
        @keyframes shakeSoft {
          0% { transform: translate(0); }
          25% { transform: translate(2px,-2px); }
          50% { transform: translate(0); }
          75% { transform: translate(-2px,2px); }
          100% { transform: translate(0); }
        }
        .animate-shakeSoft { animation: shakeSoft 0.5s linear infinite; }
        @keyframes shakeHard {
          0% { transform: translate(0); }
          25% { transform: translate(3px,-3px); }
          50% { transform: translate(0); }
          75% { transform: translate(-3px,3px); }
          100% { transform: translate(0); }
        }
        .animate-shakeHard { animation: shakeHard 0.2s linear infinite; }
      `}</style>
    </main>
  );
}

// Jest テスト (2/2)
if (typeof describe === "function") {
  describe("TodoRPGApp Additional Tests", () => {
    it("toggles task done state on click", () => {
      render(<TodoRPGApp />);
      const input = screen.getByPlaceholderText(/タスクを入力/);
      const button = screen.getByText(/追加/);
      // タスクを追加
      input.value = "toggleTest";
      button.click();
      const item = screen.getByText("toggleTest");
      // クリックで完了状態に
      item.click();
      expect(item).toHaveClass("line-through");
    });
  });
}
