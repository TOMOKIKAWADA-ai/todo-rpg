// TodoRPGApp.jsx  — Part 1 / 41
import React, { useReducer, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import SpeechBubble from "./SpeechBubble.jsx";

const ACT = { ADD_BLOCK: "add_block", ADD_TASK: "add_task", COMPLETE: "complete", REMOVE: "remove" };

const loadPresets = () => {
  try {
    return JSON.parse(localStorage.getItem("presetTasks")) || [];
  } catch {
    return [];
  }
};

const savePresets = (presets) => {
  localStorage.setItem("presetTasks", JSON.stringify(presets));
};

const CHARACTERS = ["A_01", "B_01", "C_01", "D_01", "E_01", "F_01", "G_01", "H_01", "I_01", "J_01"];
const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem("todoRPG")) ?? { blocks: [], exp: 0, level: 1 };
    if (s.blocks) {
      s.blocks.forEach(b => {
        if (!b.charId) b.charId = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      });
    }
    return s;
  } catch {
    return { blocks: [], exp: 0, level: 1 };
  }
};

const loadLongTerm = () => {
  try {
    const s = JSON.parse(localStorage.getItem("todoRPG_longterm")) ?? { blocks: [], gold: 0 };
    if (s.blocks) {
      s.blocks.forEach(b => {
        if (!b.charId) b.charId = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      });
    }
    return s;
  } catch {
    return { blocks: [], gold: 0 };
  }
};
const save = (s) => localStorage.setItem("todoRPG", JSON.stringify(s));
const saveLongTerm = (s) => localStorage.setItem("todoRPG_longterm", JSON.stringify(s));

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
        return { ...b, tasks: [...b.tasks, ...tasks], hp: b.hp + tasks.length, max: b.hp + tasks.length };
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
  const [mode, setMode] = useState("daily"); // "daily" or "longterm"
  
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [longtermState, setLongtermState] = useState(loadLongTerm);
  const [headerText, setHeaderText] = useState("");
  const [exp, setExp] = useState(load().exp);
  const [level, setLevel] = useState(load().level);
  const [gold, setGold] = useState(loadLongTerm().gold);
  const [levelUp, setLevelUp] = useState(false);
  
  const [presets, setPresets] = useState(loadPresets);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showCreatePreset, setShowCreatePreset] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({ name: "", description: "", tasks: "" });

  const currentState = mode === "daily" ? state : longtermState;
  const currentDispatch = mode === "daily" ? dispatch : (action) => {
    setLongtermState(prev => {
      const newState = reducer(prev, action);
      saveLongTerm(newState);
      return newState;
    });
  };

  const addBlockFromHeader = () => {
    if (!headerText.trim()) return;
    
    const lines = headerText.split(/[\s\n]+/).filter(line => line.trim());
    if (lines.length === 0) return;
    
    const firstLine = lines[0];
    const isTitle = firstLine.startsWith("##") || firstLine.startsWith("#");
    
    const title = isTitle ? firstLine.replace(/^#+\s*/, "") : "";
    const tasks = isTitle ? lines.slice(1) : lines;
    
    currentDispatch({ type: ACT.ADD_BLOCK, title, tasks });
    setHeaderText("");
  };

  const confirmAddToBlock = (bid) => {
    const text = blockInputs[bid];
    if (!text?.trim()) return;
    
    const tasks = text.split(/[\s\n]+/).filter(line => line.trim());
    if (tasks.length === 0) return;
    
    currentDispatch({ type: ACT.ADD_TASK, bid, tasks });
    setBlockInputs(inp => ({ ...inp, [bid]: "" }));
    setAddingBid(null);
  };

  const createPresetFromBlock = (block) => {
    const tasks = block.tasks.map(t => t.text).join('\n');
    setPresetForm({ name: block.title || "新しいプリセット", description: "", tasks });
    setShowCreatePreset(true);
  };

  const savePreset = () => {
    if (!presetForm.name.trim()) return;
    
    const tasks = presetForm.tasks.split(/[\s\n]+/).filter(line => line.trim());
    if (tasks.length === 0) return;

    const preset = {
      id: editingPreset?.id || crypto.randomUUID(),
      name: presetForm.name.trim(),
      description: presetForm.description.trim(),
      tasks
    };

    let newPresets;
    if (editingPreset) {
      newPresets = presets.map(p => p.id === editingPreset.id ? preset : p);
    } else {
      newPresets = [...presets, preset];
    }

    setPresets(newPresets);
    savePresets(newPresets);
    setShowCreatePreset(false);
    setEditingPreset(null);
    setPresetForm({ name: "", description: "", tasks: "" });
  };

  const deletePreset = (id) => {
    const newPresets = presets.filter(p => p.id !== id);
    setPresets(newPresets);
    savePresets(newPresets);
  };

  const addBlockFromPreset = (preset) => {
    currentDispatch({ type: ACT.ADD_BLOCK, title: preset.name, tasks: preset.tasks });
    setShowPresetModal(false);
  };

  const editPreset = (preset) => {
    setEditingPreset(preset);
    setPresetForm({
      name: preset.name,
      description: preset.description,
      tasks: preset.tasks.join('\n')
    });
    setShowCreatePreset(true);
    setShowPresetModal(false);
  };

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

  useEffect(() => {
    if (mode === "daily") {
      save({ ...state, exp, level });
    }
  }, [state, exp, level, mode]);

  useEffect(() => {
    if (mode === "longterm") {
      saveLongTerm({ ...longtermState, gold });
    }
  }, [longtermState, gold, mode]);

  useEffect(() => {
    const now = new Date();
    const lastReset = new Date(localStorage.getItem('lastReset') || 0);
    const resetTime = new Date(now);
    resetTime.setHours(4, 0, 0, 0);

    if (now >= resetTime && lastReset < resetTime) {
      setLevel(1);
      setExp(0);
      localStorage.setItem('lastReset', now.toISOString());
    }

    const interval = setInterval(() => {
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setHours(4, 0, 0, 0);
      if (now >= resetTime) {
        const lastReset = new Date(localStorage.getItem('lastReset') || 0);
        if (lastReset < resetTime) {
          setLevel(1);
          setExp(0);
          localStorage.setItem('lastReset', now.toISOString());
        }
      }
    }, 1000 * 60 * 60); // 1時間に1回チェック

    return () => clearInterval(interval);
  }, []);
// TodoRPGApp.jsx  — Part 3 / 4
  /* タスク完了 (長押し) */
  const finish = (bid, task) => {
    currentDispatch({ type: ACT.COMPLETE, bid, tid: task.id });
    const id = crypto.randomUUID();

    setTimeout(() => setHit({ bid }), 100);
    setTimeout(() => setHit(null), 800);

    setSlashes(s => [...s, { id, bid }]);
    setTimeout(() => setSlashes(s => s.filter(x => x.id === id)), 800);

    setPopups(p => [...p, { id, bid }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id === id)), 1100);

    setBlast(b => [...b, { id, bid }]);
    setTimeout(() => setBlast(b => b.filter(x => x.id === id)), 400);

    if (mode === "daily") {
      const newExp = exp + 50;
      const requiredExp = 20 + level * 30;
      if (newExp >= requiredExp) {
        setLevel(level + 1);
        setExp(newExp - requiredExp);
        setLevelUp(true);
        
        // コンフェッティ効果
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
        });
        
        setTimeout(() => setLevelUp(false), 2000);
      } else {
        setExp(newExp);
      }
    } else {
      // 長期モードではgoldを追加
      const newGold = gold + 100;
      setGold(newGold);
      saveLongTerm({ ...longtermState, gold: newGold });
    }
  };

  const pressStart = (bid, task) => {
    setPressingId(task.id);
    setPhase("soft");
    timers.current.soft = setTimeout(() => setPhase("medium"), 500);
    timers.current.hard = setTimeout(() => setPhase("hard"), 1000);
    timers.current.done = setTimeout(() => { finish(bid, task); pressEnd(); }, 1500);
  };
  const pressEnd = () => {
    clearTimeout(timers.current.soft); clearTimeout(timers.current.hard); clearTimeout(timers.current.done);
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
      B_01: { hit: "ぐわっ！", done: "ぐぬぬ…", low: "あと1発だと…！？", default: `あと${b.hp}だ` },
      C_01: { hit: "ひゃん！", done: "やられた…", low: "もうダメかも…", default: `のこり${b.hp}です` },
      D_01: { hit: "ぐはっ！", done: "む、無念だ…", low: "まだだ、まだ終わらん！", default: `のこり${b.hp}だ` },
      E_01: { hit: "うわあっ！", done: "負けちゃった…", low: "もう限界かも…", default: `あと${b.hp}個だよ` },
      F_01: { hit: "いたっ！", done: "お疲れ様でした", low: "最後の一つだね", default: `残り${b.hp}個です` },
      G_01: { hit: "きゃー！", done: "完敗です…", low: "ラストスパート！", default: `${b.hp}個残ってる` },
      H_01: { hit: "おおっ！", done: "やるじゃないか…", low: "最後の砦だ！", default: `まだ${b.hp}個ある` },
      I_01: { hit: "うぐっ！", done: "完全敗北…", low: "これが最後か…", default: `のこり${b.hp}つです` },
      J_01: { hit: "ぐぉっ！", done: "見事な戦いだった", low: "最後の力を振り絞る！", default: `あと${b.hp}個だ` },
    };
    const set = lines[char] || lines.A_01;
    if (hit && hit.bid === b.id) return set.hit;
    if (b.completed) return set.done;
    if (b.hp === 1) return set.low;
    return set.default;
  };
// TodoRPGApp.jsx  — Part 4 / 4
  const bgClass = mode === "daily" 
    ? "bg-gradient-to-br from-pink-500 via-red-300 to-yellow-100"
    : "bg-gradient-to-br from-red-900 via-red-700 to-red-500";

  return (
    <div className={`min-h-screen w-screen flex justify-center ${bgClass} py-10 text-[95%]`}>
      <main className="w-full max-w-lg text-white relative">
        {levelUp && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="relative">
              <div className="absolute inset-0 text-6xl font-bold text-yellow-400 animate-pulse opacity-70 blur-sm">LEVEL UP!</div>
              <div className="absolute inset-0 text-6xl font-bold text-red-400 animate-bounce opacity-50 blur-sm">LEVEL UP!</div>
              <p className="text-6xl font-bold text-white animate-levelUp drop-shadow-2xl relative z-10">LEVEL UP!</p>
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-4 left-4 w-8 h-8 bg-yellow-300 rounded-full animate-sparkle opacity-80"></div>
                <div className="absolute top-12 right-8 w-6 h-6 bg-pink-300 rounded-full animate-sparkle opacity-60" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute bottom-8 left-12 w-4 h-4 bg-blue-300 rounded-full animate-sparkle opacity-70" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute bottom-4 right-4 w-5 h-5 bg-green-300 rounded-full animate-sparkle opacity-80" style={{animationDelay: '0.6s'}}></div>
              </div>
            </div>
          </div>
        )}
        {/* タブ切り替え */}
        <div className="flex mb-6 bg-white/20 rounded-lg p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "daily" 
                ? "bg-white text-gray-800 shadow" 
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setMode("daily")}
          >
            🌅 デイリータスク
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "longterm" 
                ? "bg-white text-gray-800 shadow" 
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setMode("longterm")}
          >
            🏰 長期タスク
          </button>
        </div>

        <h1 className="text-4xl font-bold text-center mb-6">
          {mode === "daily" ? "Todo RPG ⚔️" : "Long Quest 🏰"}
        </h1>

        <div className="sticky top-4 z-40 bg-white/90 backdrop-blur-sm rounded-xl p-3 mb-4 shadow-lg border border-white/20">
          {mode === "daily" ? (
            <div className="flex items-center gap-3">
              <p className="text-xl text-gray-800 font-semibold whitespace-nowrap">Level: {level}</p>
              <div className="flex-1 bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${(exp / (20 + level * 30)) * 100}%` }}></div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xl text-gray-800 font-semibold">💰 Gold: {gold}</p>
              <p className="text-sm text-gray-600">長期タスクを完了してGoldを蓄積しよう！</p>
            </>
          )}
        </div>

        {/* プリセット管理ボタン */}
        <div className="flex gap-2 mb-4">
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            onClick={() => setShowPresetModal(true)}
          >
            📝 プリセット選択
          </button>
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            onClick={() => setShowCreatePreset(true)}
          >
            ➕ プリセット作成
          </button>
        </div>

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
        {[...currentState.blocks].reverse().map(b => (
          <section key={b.id} className={`relative bg-white/90 rounded-xl p-4 shadow-xl text-gray-800 mb-6 ${b.completed && "opacity-60 grayscale"}`}>
            <button className="absolute top-1 right-2 text-xl text-gray-500 hover:text-red-500" onClick={() => currentDispatch({ type: ACT.REMOVE, bid: b.id })}>×</button>
            <button 
              className="absolute top-1 right-8 text-xl text-gray-500 hover:text-blue-500" 
              onClick={() => createPresetFromBlock(b)}
              title="プリセットとして保存"
            >
              📝
            </button>

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
                  const shake = pressingId === t.id ? (phase === "soft" ? "animate-shakeSoft" : phase === "medium" ? "animate-shakeMedium" : "animate-shakeHard") : "";
                  const pressColor = pressingId === t.id ? (phase === "soft" ? "bg-red-100" : phase === "medium" ? "bg-red-300" : "bg-red-500 text-white") : "bg-white";
                  return (
                    <motion.li key={t.id}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} whileTap={{ scale: 0.96 }}
                      className={`list-none p-3 rounded-lg shadow transition-all duration-300 ease-in-out ${t.done ? "bg-gray-300 line-through text-gray-600" : `${pressColor} text-gray-800 cursor-pointer`} ${shake}`}
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

        {/* プリセット選択モーダル */}
        {showPresetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">プリセット選択</h3>
                <button
                  className="text-gray-500 hover:text-gray-700 text-xl"
                  onClick={() => setShowPresetModal(false)}
                >
                  ×
                </button>
              </div>
              
              {presets.length === 0 ? (
                <p className="text-gray-600 text-center py-8">プリセットがありません</p>
              ) : (
                <div className="space-y-3">
                  {presets.map(preset => (
                    <div key={preset.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">{preset.name}</h4>
                          {preset.description && (
                            <p className="text-sm text-gray-600">{preset.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="text-blue-500 hover:text-blue-700 text-sm"
                            onClick={() => editPreset(preset)}
                          >
                            ✏️
                          </button>
                          <button
                            className="text-red-500 hover:text-red-700 text-sm"
                            onClick={() => deletePreset(preset.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        タスク数: {preset.tasks.length}
                      </p>
                      <button
                        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm"
                        onClick={() => addBlockFromPreset(preset)}
                      >
                        このプリセットでブロック作成
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* プリセット作成・編集モーダル */}
        {showCreatePreset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingPreset ? "プリセット編集" : "プリセット作成"}
                </h3>
                <button
                  className="text-gray-500 hover:text-gray-700 text-xl"
                  onClick={() => {
                    setShowCreatePreset(false);
                    setEditingPreset(null);
                    setPresetForm({ name: "", description: "", tasks: "" });
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プリセット名 *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="プリセット名を入力..."
                    value={presetForm.name}
                    onChange={e => setPresetForm({...presetForm, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="説明（任意）"
                    value={presetForm.description}
                    onChange={e => setPresetForm({...presetForm, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タスク *
                  </label>
                  <textarea
                    rows={6}
                    className="w-full p-2 border rounded-md text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    placeholder="タスクをスペース・改行で区切って入力..."
                    value={presetForm.tasks}
                    onChange={e => setPresetForm({...presetForm, tasks: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                    onClick={savePreset}
                  >
                    {editingPreset ? "更新" : "保存"}
                  </button>
                  <button
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded-md"
                    onClick={() => {
                      setShowCreatePreset(false);
                      setEditingPreset(null);
                      setPresetForm({ name: "", description: "", tasks: "" });
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
        @keyframes shakeMedium{0%,100%{transform:translate(0);}25%{transform:translate(2.5px,-2.5px);}75%{transform:translate(-2.5px,2.5px);}}
        .animate-shakeMedium{animation:shakeMedium .35s linear infinite;}
        @keyframes shakeHard{0%,100%{transform:translate(0);}25%{transform:translate(3px,-3px);}75%{transform:translate(-3px,3px);}}
        .animate-shakeHard{animation:shakeHard .25s linear infinite;}

        @keyframes hitShake{0%,100%{transform:translate(0);}20%{transform:translate(1px,-1px);}40%{transform:translate(-1px,1px);}60%{transform:translate(1px,1px);}80%{transform:translate(-1px,-1px);}}
        .animate-hitShake{animation:hitShake .3s linear infinite;} 

        @keyframes blast{0%{opacity:.7;transform:scale(1);}100%{opacity:0;transform:scale(2);}}
        .animate-blast{animation:blast .4s ease-out forwards;}

        @keyframes levelUp{0%{transform:scale(0.8) rotate(-5deg);opacity:0;}25%{transform:scale(1.2) rotate(2deg);opacity:1;}50%{transform:scale(0.9) rotate(-1deg);}75%{transform:scale(1.1) rotate(1deg);}100%{transform:scale(1) rotate(0deg);}}
        .animate-levelUp{animation:levelUp 1s ease-in-out;}

        @keyframes sparkle{0%{opacity:0;transform:scale(0) rotate(0deg);}50%{opacity:1;transform:scale(1) rotate(180deg);}100%{opacity:0;transform:scale(0) rotate(360deg);}}
        .animate-sparkle{animation:sparkle 1.5s ease-in-out infinite;}
      `}</style>
    </div>
  );
}