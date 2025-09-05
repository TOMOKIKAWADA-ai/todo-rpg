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
  const [showHelpModal, setShowHelpModal] = useState(false);

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
  
  /* 吹き出しテキストの安定化 */
  const [stableBubbleTexts, setStableBubbleTexts] = useState({});

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
    const id = crypto.randomUUID();

    // hit状態を先に設定してからブロック状態を更新
    setHit({ bid });
    
    // ブロック状態の更新を少し遅らせる
    setTimeout(() => {
      currentDispatch({ type: ACT.COMPLETE, bid, tid: task.id });
    }, 50);

    setTimeout(() => setHit(null), 800);

    setSlashes(s => [...s, { id, bid }]);
    setTimeout(() => setSlashes(s => s.filter(x => x.id !== id)), 800);

    setPopups(p => [...p, { id, bid }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), 1100);

    setBlast(b => [...b, { id, bid }]);
    setTimeout(() => setBlast(b => b.filter(x => x.id !== id)), 400);

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

  const getBubbleText = (b) => {
    const char = b.charId ?? "A_01";
    const lines = {
      A_01: { 
        hit: ["きゃっ！", "いたっ！"], 
        done: ["やられた～", "負けちゃった～"], 
        low: ["やばっ♡ \n あと一つじゃん！", "もうだめかも～"], 
        default: ["ざぁこ♡ \n ざぁこ♡", "ざこざこ♡ \n また言い訳～？"] 
      },
      B_01: { 
        hit: ["ぐわっ！", "うぐっ！"], 
        done: ["ぐぬぬ……", "完敗だぁ……"], 
        low: ["あと1発だとぉ♡", "やばっ♡"], 
        default: ["おにーさん、 \n まだ甘えてんの～？", "ざこすぎ～♡ \n 計画も守れないの～？"] 
      },
      C_01: { 
        hit: ["ひゃん！", "きゃー！"], 
        done: ["やられた……", "もうダメェ…"], 
        low: ["もうダメかも……", "最後の一つ？やるね♡"], 
        default: ["ざこおにーさん、 \n 今やろ？ね、ね？", `ざぁこ♡ \n 継続力よわよわ♡`] 
      },
      D_01: { 
        hit: ["ぐはっ！", "ぐっ！"], 
        done: ["む、無念だ…", "参った…"], 
        low: ["まだ、まだ終わらん！", "最後の意地だ！"], 
        default: ["時刻です、 \n 開始をどうぞ♡", "今開始するよ♡"] 
      },
      E_01: { 
        hit: ["うわあっ！", "きゃあっ！"], 
        done: ["負けちゃったぁ……", "やられちゃったぁ"], 
        low: ["もう限界かも……♡", "すごい、 \n 最後の一つだ……♡"], 
        default: ["ざこおにーさん、 \n 今動こうよ？♡", "ざぁこ♡ \n まず一個終わらせろ♡"] 
      },
      F_01: { 
        hit: ["いたっ！", "あいたっ！"], 
        done: ["見事だ……", "完敗だ……"], 
        low: ["やるじゃねーか！", "あと一発だぞ！"],
        default: ["ビビってんの？ \n 勝負！", "弱気？ \n 似合わないねえ"] 
      },
      G_01: { 
        hit: ["きゃー！", "ひゃあっ！"], 
        done: ["完敗です……", "やられました……"], 
        low: ["これが最後か…！", "最後の一つ！"], 
        default: ["ゆっくりでいい、 \n 始めよう", "綺麗に \n 片付けようね"] 
      },
      H_01: { 
        hit: ["おおっ！", "うおっ！"], 
        done: ["戦闘不能……", "完全敗北……"], 
        low: ["最後の一つだね", "なかなかやるね"] , 
        default: ["行動するだけ、 \n 難しい？", `未完了${b.hp}件、 \n 今すぐ着手を`] 
      },
      I_01: { 
        hit: ["うぐっ！", "ぐっ！"], 
        done: ["や、やられたぁ……", "負けちゃったぁ……"], 
        low: ["やばっ♡ \n これが最後？", "ひゃっ…ピンチ！"], 
        default: ["サクッと \n 終わらせよ?♡", "ざぁこ♡ \n 置いてっちゃうよ"] 
      },
      J_01: { 
        hit: ["いたっ！", "あいたっ！"], 
        done: ["見事な戦いだった", "お見事…"], 
        low: ["最後の力を振り絞る！", "不覚…！"], 
        default: ["本日中に \n 仕上げましょ？♡", "まだ様子見？ \n 始めましょ♡"] 
      },
    };
    const set = lines[char] || lines.A_01;
    
    // 状態に応じたテキストを決定
    let targetLines;
    let stateKey;
    
    if (hit && hit.bid === b.id) {
      targetLines = set.hit;
      stateKey = `${b.id}-hit`;
    } else if (b.completed) {
      targetLines = set.done;
      stateKey = `${b.id}-done`;
    } else if (b.hp === 1) {
      targetLines = set.low;
      stateKey = `${b.id}-low`;
    } else {
      targetLines = set.default;
      stateKey = `${b.id}-default-${b.hp}`;
    }
    
    // 安定したテキストを取得または生成
    if (!stableBubbleTexts[stateKey]) {
      const newText = targetLines[Math.floor(Math.random() * targetLines.length)];
      setStableBubbleTexts(prev => ({ ...prev, [stateKey]: newText }));
      return newText;
    }
    
    return stableBubbleTexts[stateKey];
  };
// TodoRPGApp.jsx  — Part 4 / 4
  const bgClass = mode === "daily" 
    ? "bg-gradient-to-br from-orange-400 via-orange-300 to-yellow-200"
    : "bg-gradient-to-br from-red-900 via-red-700 to-red-500";

  return (
    <div className={`min-h-screen w-screen flex justify-center ${bgClass} py-10 text-[95%]`}>
      <div className="halftone-overlay" aria-hidden="true">
        <div className="halftone-layer band-1 dots-gap-12 dots-size-16"></div>
        <div className="halftone-layer band-2 dots-gap-12 dots-size-20"></div>
        <div className="halftone-layer band-3 dots-gap-12 dots-size-24"></div>
        <div className="halftone-layer band-4 dots-gap-12 dots-size-32"></div>
      </div>
      <main className="w-full max-w-lg text-white relative z-10">
        {levelUp && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{zIndex: 9999}}>
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
        <div className="flex gap-3 mb-6">
          <button
            className={`flex-1 py-3 px-6 rounded-full text-sm font-bold transition-all transform hover:scale-105 ${
              mode === "daily" 
                ? "bg-white text-orange-600 shadow-lg" 
                : "bg-white/20 text-white border-2 border-white/30 hover:bg-white/30"
            }`}
            onClick={() => setMode("daily")}
          >
            デイリー
          </button>
          <button
            className={`flex-1 py-3 px-6 rounded-full text-sm font-bold transition-all transform hover:scale-105 ${
              mode === "longterm" 
                ? "bg-white text-red-600 shadow-lg" 
                : "bg-white/20 text-white border-2 border-white/30 hover:bg-white/30"
            }`}
            onClick={() => setMode("longterm")}
          >
            長期クエスト
          </button>
        </div>

        <div className="relative mb-8">
          <img
            src="/logo-01.png"
            alt="Todo RPG ロゴ"
            className="mx-auto block h-auto w-[21rem] sm:w-96 md:w-[27rem] drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]"
          />
          <button
            className="absolute top-0 right-0 w-10 h-10 bg-white hover:bg-yellow-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg transition-all transform hover:scale-110 shadow-lg"
            onClick={() => setShowHelpModal(true)}
            title="ヘルプ"
          >
            ?
          </button>
        </div>

        <div className="sticky top-4 z-40 bg-gradient-to-r from-white to-orange-50 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-[0_3px_0_rgba(0,0,0,0.15)] border-2" style={{borderColor: 'rgba(107,114,128,0.9)'}}>
          {mode === "daily" ? (
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg">
                Lv.{level}
              </div>
              <div className="flex-1">
                <div className="bg-orange-100 rounded-full h-6 border-2 border-orange-300">
                  <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full transition-all duration-500 shadow-inner" 
                       style={{ width: `${(exp / (20 + level * 30)) * 100}%` }}></div>
                </div>
                <p className="text-xs text-orange-700 mt-1 font-medium">{exp} / {20 + level * 30} EXP</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-2xl text-yellow-600 font-bold flex items-center justify-center gap-2">
                <span className="text-3xl">{gold}</span> <span className="text-lg">Gold</span>
              </p>
              <p className="text-sm text-orange-700 font-medium mt-1">長期クエストでGoldを蓄積しよう！</p>
            </div>
          )}
        </div>

        {/* プリセット管理ボタン */}
        <div className="flex gap-3 mb-6">
          <button
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full text-sm font-bold transition-all transform hover:scale-105 shadow-lg"
            onClick={() => setShowPresetModal(true)}
          >
            プリセット選択
          </button>
          <button
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full text-sm font-bold transition-all transform hover:scale-105 shadow-lg"
            onClick={() => setShowCreatePreset(true)}
          >
            プリセット作成
          </button>
        </div>

        {/* 新ブロックフォーム */}
        <div className="bg-gradient-to-r from-white to-orange-50 rounded-2xl p-4 shadow-[0_3px_0_rgba(0,0,0,0.15)] border-2 mb-8" style={{borderColor: 'rgba(107,114,128,0.9)'}}>
          <textarea
            rows={3}
            className="w-full p-3 bg-white text-gray-800 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none text-sm"            style={{borderColor: 'rgba(107,114,128,0.9)', '--tw-ring-color': 'rgba(107,114,128,0.9)'}}
            placeholder="スペース・改行でタスクを入力..."
            value={headerText}
            onChange={e => setHeaderText(e.target.value)}
          />
          <button
            className="mt-3 w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-full text-lg transition-all transform hover:scale-105 shadow-lg"
            onClick={addBlockFromHeader}
          >
            追加（新ブロック）
          </button>
        </div>

        {/* ブロック一覧 */}
        {[...currentState.blocks].reverse().map(b => (
          <section
            key={b.id}
            className={`relative rounded-2xl p-5 shadow-[0_3px_0_rgba(0,0,0,0.15)] border-2 text-gray-800 mb-6 transition-all ${b.completed ? "opacity-60 grayscale" : "hover:shadow-[0_4px_0_rgba(0,0,0,0.2)] hover:scale-102"}`}
            style={{ backgroundColor: '#fef7ef', borderColor: 'rgba(107,114,128,0.9)' }}
          >
            <button className="absolute top-1 right-2 text-xl text-gray-500 hover:text-red-500 bg-transparent p-0 border-0 shadow-none" onClick={() => currentDispatch({ type: ACT.REMOVE, bid: b.id })}>×</button>
            <button 
              className="absolute top-1 right-8 text-xl text-gray-500 hover:text-blue-500 bg-transparent p-0 border-0 shadow-none" 
              onClick={() => createPresetFromBlock(b)}
              title="プリセットとして保存"
            >
              S
            </button>

            {b.title && <h2 className="text-xl font-bold mb-2 text-center">{b.title}</h2>}

            {/* HP & enemy */}
            <div className="relative flex flex-col items-center mb-4">
              <span className="font-mono text-lg">{"♥".repeat(b.hp) + "♡".repeat(b.max - b.hp)}</span>

              <div className="relative" ref={el => (enemyRefs.current[b.id] = el)}>
                {/* ▼ 吹き出しの表示位置を調整 ▼ */}
                {/* top: 上下位置 (負の値が大きいほど上) */}
                {/* left: 左右位置 (負の値が大きいほど左) */}
                <SpeechBubble text={getBubbleText(b)} size={140} className="absolute top-[-10px] left-[-100px]" />

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
              <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.15)] border-2" style={{borderColor: 'rgba(107,114,128,0.9)'}}>
                <textarea
                  rows={2}
                  className="w-full p-3 bg-white border-2 rounded-lg resize-none text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500" style={{borderColor: 'rgba(107,114,128,0.9)', '--tw-ring-color': 'rgba(107,114,128,0.9)'}}
                  placeholder="スペース・改行でタスクを入力..."
                  value={blockInputs[b.id] ?? ""}
                  onChange={e => setBlockInputs(inp => ({ ...inp, [b.id]: e.target.value }))}
                />
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full text-sm font-bold transition-all transform hover:scale-105" onClick={() => confirmAddToBlock(b.id)}>
                    追加
                  </button>
                  <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-bold transition-all" onClick={() => setAddingBid(null)}>
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              !b.completed && (
                <button className="mt-4 w-12 h-12 flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full text-2xl font-bold transition-all transform hover:scale-110 shadow-lg" onClick={() => setAddingBid(b.id)}>
                  +
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
                            編集
                          </button>
                          <button
                            className="text-red-500 hover:text-red-700 text-sm"
                            onClick={() => deletePreset(preset.id)}
                          >
                            削除
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

        {/*
          ヘルプモーダル（アプリ説明と使い方）
          - アプリ内の説明文やガイド文を修正したい場合は、このモーダル内のテキストを編集してください。
          - 主な構成: 「アプリの説明」→「基本操作」→「モード説明」→「データについて」
          - 目印となるキーワード: "ヘルプモーダル" / "Todo RPG ガイド"
        */}
        {/* ヘルプモーダル */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  Todo RPG ガイド
                </h3>
                <button
                  className="text-gray-500 hover:text-gray-700 text-xl"
                  onClick={() => setShowHelpModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6 text-gray-700">
                {/* アプリの説明（概要）
                   - アプリの一言説明や目的を変更したい場合はこのセクションの文言を編集します。 */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    アプリの説明
                  </h4>
                  <div className="bg-white/70 p-3 rounded-lg text-sm">
                    <p className="mb-1">
                      世の中のToDoリストって、完了してもちょっとキラッとする程度で、全然タスクを”完了”した感がなくない？との思いから「完了した手ごたえのあるToDoリスト」を作ろうとしたら、なぜかキャラクターも生えてきてしまいました。
                      怠惰を司る小悪魔を長押しで「攻撃」して完了させることで、レベルアップや演出を楽しみながら前に進めます。
                    </p>
                    <h5 className="text-base font-semibold text-gray-800 mt-2 mb-1">おすすめの使い方</h5>
                    <p className="mb-2">
                      「起床」「歯を磨く」など小分けにして一つずつ完了していくと日常をよりゲーム的に楽しむことができます。
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs mt-6">
                      <li>タスクはブロック単位で管理し、残り数はHP表示で確認</li>
                      <li>デイリー（毎日リセット）と長期クエスト（継続保存）の2モード</li>
                      <li>よく使うタスクはプリセットに保存して素早く呼び出し</li>
                    </ul>
                  </div>
                </section>
                {/* 基本操作 */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    基本操作
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium mb-2">1. タスクブロックを作成</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>テキストエリアにタスクを入力（スペース・改行で区切り）</li>
                        <li>文字の頭に<code className="bg-gray-200 px-1 rounded">##</code>または<code className="bg-gray-200 px-1 rounded">#</code>を付けた文字列はそのブロックのタイトルという扱いになります。（タスクとはなりません）</li>
                        <li>「追加（新ブロック）」ボタンでブロック作成</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium mb-2">2. タスクを完了</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>タスクを1.5秒間長押し</strong>して「攻撃」できます。</li>
                        <li>タスクを完了するごとにEXPがたまり、EXPが一定量上がるとレベルアップします。</li>
                        <li>レベルアップすると何がある？おめでたい感じのエフェクトが出て、ちょっと嬉しい気分になります。それ以外は何もありません……今のところ。</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium mb-2">3. プリセット活用</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>「プリセット選択」で保存済みタスクを選択</li>
                        <li>「プリセット作成」で新しいプリセットを作成</li>
                        <li>ブロック右上のSボタンで既存ブロックをプリセット化</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* モード説明
                    - 各モードの説明文や見出しを変更したい場合はこのセクションを編集します。 */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    モード切り替え
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gradient-to-br from-pink-50 to-yellow-50 p-4 rounded-lg border">
                      <h5 className="font-medium mb-2 text-pink-700">デイリータスク</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>経験値・レベル制システム</li>
                        <li>毎日午前4時にリセット</li>
                        <li>タスク完了で経験値+50獲得</li>
                        <li>レベルアップ時は華やかなエフェクト</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border">
                      <h5 className="font-medium mb-2 text-red-700">長期タスク</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>ゴールドを蓄積するシステム</li>
                        <li>データは永続的に保存</li>
                        <li>タスク完了でゴールド+100獲得</li>
                        <li>大きなプロジェクト管理に最適</li>
                      </ul>
                    </div>
                  </div>
                </section>

                

                {/* 技術情報 */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    データについて
                  </h4>
                  <div className="bg-yellow-50 p-4 rounded-lg text-sm">
                    <p className="mb-2">すべてのデータはブラウザのlocalStorageに保存されます：</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>デイリータスク:</strong> 毎日4時リセット（レベル・経験値含む）</li>
                      <li><strong>長期タスク:</strong> 永続保存（ゴールド含む）</li>
                      <li><strong>プリセット:</strong> 永続保存</li>
                      <li>ブラウザデータをクリアすると全て消失します</li>
                    </ul>
                  </div>
                </section>
              </div>

              <div className="mt-6 text-center">
                <button
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  onClick={() => setShowHelpModal(false)}
                >
                  始める！
                </button>
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
