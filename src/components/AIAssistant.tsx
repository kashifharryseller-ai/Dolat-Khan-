import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Brain, Volume2, X, MessageSquare, Sparkles, Loader2 } from 'lucide-react';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'thinking' | 'voice'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, thinking?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Fast AI Response (Flash Lite)
  const handleChat = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: text,
        config: {
          systemInstruction: "You are the AI assistant for 'Kitabon Ki Dolat', a book platform by Dolat Khan Kakar. You help users find books, learn about the author, and understand the value of reading. Keep responses concise and inspiring.",
        }
      });
      const aiText = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Thinking Mode (Pro)
  const handleThinking = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: text,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction: "You are the Deep Thinking Assistant for 'Kitabon Ki Dolat'. Provide profound, well-reasoned insights about literature, philosophy, and the themes in Dolat Khan Kakar's work.",
        }
      });
      const aiText = response.text || "Deep thoughts are hard to find right now.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // TTS (Speech Generation)
  const handleTTS = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Decode base64 to ArrayBuffer
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert PCM to AudioBuffer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // The PCM data is 16-bit little-endian
        const dataView = new DataView(bytes.buffer);
        const numSamples = bytes.length / 2;
        const audioBuffer = audioContext.createBuffer(1, numSamples, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
          // Read 16-bit integer and normalize to -1.0 to 1.0
          const int16 = dataView.getInt16(i * 2, true);
          channelData[i] = int16 / 32768.0;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        source.onended = () => {
          setIsSpeaking(false);
          audioContext.close();
        };
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error(error);
      setIsSpeaking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    if (mode === 'chat') handleChat(userMsg);
    else if (mode === 'thinking') handleThinking(userMsg);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 z-50 w-16 h-16 bg-gradient-to-br from-gold to-gold-bright rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
      >
        <Sparkles className="text-midnight w-8 h-8 group-hover:rotate-12 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[6000] w-[400px] h-[600px] bg-slate border border-gold/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-midnight border-b border-gold/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="text-gold w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-gold">Library Assistant</h3>
                  <p className="text-xs text-gold/60">Powered by Gemini AI</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gold/60 hover:text-gold">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="flex p-2 bg-midnight/50 gap-2">
              <button
                onClick={() => setMode('chat')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors ${mode === 'chat' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
              >
                <MessageSquare className="w-4 h-4" /> Fast
              </button>
              <button
                onClick={() => setMode('thinking')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors ${mode === 'thinking' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
              >
                <Brain className="w-4 h-4" /> Deep
              </button>
              <button
                onClick={() => setMode('voice')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors ${mode === 'voice' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
              >
                <Mic className="w-4 h-4" /> Live
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <Sparkles className="w-12 h-12 text-gold" />
                  <p className="font-serif text-lg">How can I help you explore the wealth of books today?</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-gold text-midnight rounded-tr-none' : 'bg-navy text-white rounded-tl-none border border-gold/10'}`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.role === 'ai' && (
                      <button 
                        onClick={() => handleTTS(msg.text)}
                        className="mt-2 text-gold/60 hover:text-gold transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-navy p-4 rounded-2xl rounded-tl-none border border-gold/10">
                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-6 bg-midnight border-t border-gold/20">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === 'thinking' ? "Ask a complex question..." : "Type your message..."}
                  className="w-full bg-slate border border-gold/20 rounded-2xl py-4 pl-6 pr-14 text-white focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-gold text-midnight rounded-xl hover:bg-gold-bright transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
