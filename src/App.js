
import React, { useState, useRef } from "react";
import axios from "axios";

function App() {
  const [mode, setMode] = useState("recognition");
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [inputText, setInputText] = useState("The quick brown fox");
  const [score, setScore] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioURL(url);

      if (mode === "evaluation") {
        sendToElsa(blob);
      } else {
        recognizeSpeech(blob);
      }
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const recognizeSpeech = (blob) => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      setRecognizedText(event.results[0][0].transcript);
    };
    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e);
    };
    recognition.start();
  };

  const sendToElsa = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.webm");
    formData.append("transcript", inputText);

    try {
      const response = await axios.post("https://api.elsanow.io/v1/evaluation", formData, {
        headers: {
          "Authorization": "Bearer YOUR_ELSA_API_KEY",
          "Content-Type": "multipart/form-data"
        }
      });

      setScore(response.data.overall_score);
    } catch (error) {
      console.error("ELSA API Error:", error);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>🗣 Pronunciation Tool</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          <input
            type="radio"
            value="recognition"
            checked={mode === "recognition"}
            onChange={() => { setMode("recognition"); setScore(null); setRecognizedText(""); }}
          />
          発音から単語認識
        </label>
        <label style={{ marginLeft: "1rem" }}>
          <input
            type="radio"
            value="evaluation"
            checked={mode === "evaluation"}
            onChange={() => { setMode("evaluation"); setScore(null); setRecognizedText(""); }}
          />
          入力文の発音評価（ELSA）
        </label>
      </div>

      {mode === "evaluation" && (
        <div style={{ marginBottom: "1rem" }}>
          <label>
            読む文を入力：
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
            />
          </label>
        </div>
      )}

      {!recording && <button onClick={handleStartRecording}>🎙 Start Recording</button>}
      {recording && <button onClick={handleStopRecording}>🛑 Stop Recording</button>}

      {audioURL && (
        <div style={{ marginTop: "1rem" }}>
          <p>🎧 録音再生：</p>
          <audio controls src={audioURL}></audio>
        </div>
      )}

      {mode === "recognition" && recognizedText && (
        <div style={{ marginTop: "1rem" }}>
          <p>🔍 認識されたテキスト：<strong>{recognizedText}</strong></p>
        </div>
      )}

      {mode === "evaluation" && score !== null && (
        <div style={{ marginTop: "1rem" }}>
          <p>✅ 発音スコア：<strong>{score}</strong></p>
        </div>
      )}
    </div>
  );
}

export default App;
