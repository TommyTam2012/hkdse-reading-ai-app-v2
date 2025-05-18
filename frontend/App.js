import React, { useState, useEffect } from "react";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (username && password) {
      setLoggedIn(true);
    } else {
      alert("\u8bf7\u8f93\u5165\u7528\u6237\u540d\u548c\u5bc6\u7801\u3002");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100">
        <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">TommySir's \u6587\u51fd\u8bd5\u9605\u8bfb AI \u8003\u8bd5\u52a9\u624b</h2>
          <p className="mb-6 text-center text-gray-600">\u767b\u5f55\u60a8\u7684\u8d26\u6237\u4ee5\u5f00\u59cb\u5b66\u4e60</p>
          <input
            type="text"
            placeholder="\u8bf7\u8f93\u5165\u7528\u6237\u540d"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 p-3 border rounded border-blue-300"
          />
          <input
            type="password"
            placeholder="\u8bf7\u8f93\u5165\u5bc6\u7801"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 p-3 border rounded border-blue-300"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            \u767b\u5f55
          </button>
        </div>
      </div>
    );
  }

  const exams = [
    { id: "hkdse2012A", label: "\ud83d\udcd8 HKDSE Academic Reading 2012A", pdf: "/exams/hkdse/hkdse2012A.pdf" },
    { id: "hkdse2012B", label: "\ud83d\udcd8 HKDSE Academic Reading 2012B", pdf: "/exams/hkdse/hkdse2012B.pdf" },
    { id: "hkdse2012C", label: "\ud83d\udcd8 HKDSE Academic Reading 2012C", pdf: "/exams/hkdse/hkdse2012C.pdf" },
    { id: "hkdse2013A", label: "\ud83d\udcd8 HKDSE Academic Reading 2013A", pdf: "/exams/hkdse/hkdse2013A.pdf" },
    { id: "hkdse2013B", label: "\ud83d\udcd8 HKDSE Academic Reading 2013B", pdf: "/exams/hkdse/hkdse2013B.pdf" },
    { id: "hkdse2013C", label: "\ud83d\udcd8 HKDSE Academic Reading 2013C", pdf: "/exams/hkdse/hkdse2013C.pdf" },
  ];

  const [selectedExamId, setSelectedExamId] = useState("");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);

  const detectLang = (text) => /[\u4e00-\u9fa5]/.test(text) ? "zh-CN" : "en-GB";

  const getVoiceForLang = (lang) => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang === lang) ||
           voices.find(v => v.name.includes(lang === "zh-CN" ? "\u666e\u901a\u8bdd" : "UK English Female"));
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
      alert("\u26a0\ufe0f Please enter a question and select an exam.");
      return;
    }

    setResponse("Analyzing with GPT-4o, please wait...");

    const totalPages = 13;
    const messages = [
      {
        type: "text",
        text: `You are an HKDSE Academic Reading instructor. The student is working on test ${selectedExamId.toUpperCase()}. If they ask about a question (e.g., \"Q5\" or \"paragraph B\"), find the answer from the reading passage images and respond in academic English. Focus on the exact question asked. Do not summarize the passage unless requested.`,
      },
      { type: "text", text: question }
    ];

    for (let i = 1; i <= totalPages; i++) {
      const url = `${window.location.origin}/exams/hkdse/${selectedExamId}_page${i}.png`;
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
      const translated = data.translated || "\u65e0\u4e2d\u6587\u7ffb\u8bd1\u3002";

      const final = `${english}\n\n\ud83c\udde8\ud83c\uddf3 \u4e2d\u6587\u7ffb\u8bd1\uff1a${translated}`;
      setResponse(final);
      setHistory(prev => [...prev, { question, answer: final }]);
      setQuestion("");
    } catch (err) {
      console.error("GPT error:", err);
      setResponse("\u274c Error occurred. Please try again.");
    }
  };

  useEffect(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;

    const handleMic = () => recognition.start();
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setQuestion(spoken);
      handleSubmit();
    };
    recognition.onerror = (event) => {
      alert("\ud83c\udfa4 Speech recognition failed.");
      console.error("Mic error:", event.error);
    };

    window.startVoiceInput = handleMic;
  }, []);

  return (
    <div className="p-6 bg-blue-100 min-h-screen text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
        HKDSE Academic Reading AI \u52a9\u624b
      </h1>

      <div className="mb-6">
        <div className="font-semibold mb-2">\ud83d\udcd8 \u9009\u62e9\u8003\u8bd5\uff1a</div>
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
      </div>

      <div className="mb-6">
        <div className="font-semibold mb-2">\ud83d\udcdd \u63d0\u95ee\u95ee\u9898\uff1a</div>
        <textarea
          className="w-full p-2 rounded border border-blue-300"
          rows="4"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="\u4f8b\u5982\uff1aWhat is the answer to Q18? \u6216\u8005 Which paragraph mentions tourism in the Arctic?"
        />
        <div className="mt-2 flex gap-3">
          <button
            onClick={handleSubmit}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            \u63d0\u4ea4\u95ee\u9898
          </button>
          <button
            onClick={() => window.startVoiceInput()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            \ud83c\udfa4 \u8bed\u97f3\u63d0\u95ee
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="font-semibold mb-2">\ud83d\udce5 \u56de\u7b54\u7ed3\u679c\uff1a</div>
        <div className="bg-white text-gray-700 p-4 rounded min-h-[100px] border border-blue-200 whitespace-pre-wrap">
          {response || "\u63d0\u4ea4\u95ee\u9898\u540e\u5c06\u663e\u793a\u7b54\u6848"}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => speakMixed(response)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            \ud83d\udd0a \u542c\u56de\u7b54
          </button>
          <button
            onClick={() => window.speechSynthesis.cancel()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            \ud83d\udd07 \u505c\u6b62\u64ad\u653e
          </button>
        </div>
      </div>

      <div>
        <div className="font-semibold mb-2">\ud83d\udcdc \u5386\u53f2\u5bf9\u8bdd\uff1a</div>
        {history.length === 0 ? (
          <div className="text-gray-500">\u6682\u65e0\u5386\u53f2\u8bb0\u5f55</div>
        ) : (
          <ul className="space-y-3">
            {history.map((item, index) => (
              <li key={index} className="bg-white p-3 rounded border border-blue-200">
                <div className="text-blue-700 text-sm">\u60a8\u95ee\uff1a{item.question}</div>
                <div className="text-green-600 text-sm mt-1">AI \u56de\u7b54\uff1a{item.answer}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
