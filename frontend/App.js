import React, { useState, useEffect } from "react";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [speechLang, setSpeechLang] = useState("en-US");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (username && password) {
      setLoggedIn(true);
    } else {
      alert("请输入用户名和密码。");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100">
        <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">TommySir's 文凭试阅读 AI 考试助手</h2>
          <p className="mb-6 text-center text-gray-600">登录您的账户以开始学习</p>
          <input
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 p-3 border rounded border-blue-300"
          />
          <input
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 p-3 border rounded border-blue-300"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  const exams = [
    { id: "2012A", label: "📘 HKDSE Academic Reading 2012A", pdf: "/exams/hkdse/hkdse2012A.pdf" },
    { id: "2012B", label: "📘 HKDSE Academic Reading 2012B", pdf: "/exams/hkdse/hkdse2012B.pdf" },
    { id: "2012C", label: "📘 HKDSE Academic Reading 2012C", pdf: "/exams/hkdse/hkdse2012C.pdf" },
    { id: "2013A", label: "📘 HKDSE Academic Reading 2013A", pdf: "/exams/hkdse/hkdse2013A.pdf" },
    { id: "2013B", label: "📘 HKDSE Academic Reading 2013B", pdf: "/exams/hkdse/hkdse2013B.pdf" },
    { id: "2013C", label: "📘 HKDSE Academic Reading 2013C", pdf: "/exams/hkdse/hkdse2013C.pdf" },
  ];

  const [selectedExamId, setSelectedExamId] = useState("");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);

  const detectLang = (text) => /[\u4e00-\u9fa5]/.test(text) ? "zh-CN" : "en-GB";

  const getVoiceForLang = (lang) => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang === lang) ||
           voices.find(v => v.name.includes(lang === "zh-CN" ? "普通话" : "UK English Female"));
  };

  const speakMixed = (text) => {
    const segments = text.split(/(?<=[\u3002.!?])/).map(s => s.trim()).filter(Boolean);
    let index = 0;
    const speakNext = () => {
      if (index >= segments.length) return;
      const segment = segments[index++];
      const utter = new SpeechSynthesisUtterance(segment);
      const lang = detectLang(segment);
      utter.lang = lang;
      utter.voice = getVoiceForLang(lang);
      utter.rate = 1;
      utter.onend = speakNext;
      speechSynthesis.speak(utter);
    };
    speechSynthesis.cancel();
    speakNext();
  };

  const handleSubmit = async () => {
    if (!question || !selectedExamId) {
      alert("⚠️ Please enter a question and select an exam.");
      return;
    }

    setResponse("Analyzing with GPT-4o, please wait...");

    const totalPages = 6;
    const messages = [
      {
        type: "text",
        text: `You are an HKDSE Academic Reading instructor. The student is working on test HKDSE${selectedExamId.toUpperCase()}. If they ask about a question (e.g., \"Q5\" or \"paragraph B\"), find the answer from the reading passage images and respond in academic English. Focus on the exact question asked. Do not summarize the passage unless requested.`,
      },
      { type: "text", text: question }
    ];

    for (let i = 1; i <= totalPages; i++) {
      const url = `${window.location.origin}/exams/hkdse/hkdse${selectedExamId}_page${i}.png`;
      messages.push({ type: "image_url", image_url: { url } });
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, messages }),
      });

      const data = await res.json();
      const english = data.response || "No response.";
      const translated = data.translated || "无中文翻译。";

      const final = `${english}\n\n🇨🇳 中文翻译：${translated}`;
      setResponse(final);
      setHistory(prev => [...prev, { question, answer: final }]);
      setQuestion("");
    } catch (err) {
      console.error("GPT error:", err);
      setResponse("❌ Error occurred. Please try again.");
    }
  };

  useEffect(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = speechLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setQuestion(spoken);
      handleSubmit();
    };

    recognition.onerror = (event) => {
      alert("🎤 语音识别失败");
      console.error("Mic error:", event.error);
    };

    const startListening = () => {
      if (!isListening) {
        recognition.start();
        isListening = true;
      }
    };

    const stopListening = () => {
      if (isListening) {
        recognition.stop();
        isListening = false;
      }
    };

    window.startVoiceInput = startListening;
    window.stopVoiceInput = stopListening;
  }, []);

  return (
    <div className="p-6 bg-blue-100 min-h-screen text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
        HKDSE Academic Reading AI 助手
      </h1>

      <div className="mb-6">
        <div className="font-semibold mb-2">📘 选择考试：</div>
        <div className="flex flex-wrap gap-3">
          {exams.map(exam => (
            <button
              key={exam.id}
              onClick={() => {
                setSelectedExamId(exam.id);
                window.open(exam.pdf, "_blank");
              }}
              className={`px-4 py-2 rounded ${selectedExamId === exam.id ? "bg-blue-700" : "bg-blue-500"} text-white hover:bg-blue-600`}
            >
              {exam.label}
            </button>
          ))}
        </div>

      <div className="mt-4">
        <label className="font-semibold mr-2">🎙️ 语音识别语言：</label>
        <select
          value={speechLang}
          onChange={(e) => setSpeechLang(e.target.value)}
          className="p-2 border rounded border-blue-300"
        >
          <option value="en-US">English</option>
          <option value="zh-CN">中文</option>
        </select>
      </div>

      </div>
      <div className="mb-6">
        <div className="font-semibold mb-2">📝 提问问题：</div>
        <textarea
          className="w-full p-2 rounded border border-blue-300"
          rows="4"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：What is the answer to Q18? 或者 Which paragraph mentions tourism in the Arctic?"
        />
        <div className="mt-2">
  <label className="font-semibold mr-2">🎙️ 語音語言：</label>
  <select
    value={speechLang}
    onChange={(e) => setSpeechLang(e.target.value)}
    className="p-2 border border-blue-300 rounded"
  >
    <option value="en-US">English</option>
    <option value="zh-CN">中文</option>
  </select>
</div>

$1
          <button
            onClick={handleSubmit}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            提交问题
          </button>
          <button
  onMouseDown={() => window.startVoiceInput()}
  onMouseUp={() => window.stopVoiceInput()}
  onTouchStart={() => window.startVoiceInput()}
  onTouchEnd={() => window.stopVoiceInput()}
  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
>
  🎤 长按说话
</button>
        </div>
      </div>

      <div className="mb-6">
        <div className="font-semibold mb-2">📥 回答结果：</div>
        <div className="bg-white text-gray-700 p-4 rounded min-h-[100px] border border-blue-200 whitespace-pre-wrap">
          {response || "提交问题后将显示答案"}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => speakMixed(response)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            🔊 听回答
          </button>
          <button
            onClick={() => window.speechSynthesis.cancel()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            🔇 停止播放
          </button>
        </div>
      </div>

      <div>
        <div className="font-semibold mb-2">📜 历史对话：</div>
        {history.length === 0 ? (
          <div className="text-gray-500">暂无历史记录</div>
        ) : (
          <ul className="space-y-3">
            {history.map((item, index) => (
              <li key={index} className="bg-white p-3 rounded border border-blue-200">
                <div className="text-blue-700 text-sm">您问：{item.question}</div>
                <div className="text-green-600 text-sm mt-1">AI 回答：{item.answer}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
