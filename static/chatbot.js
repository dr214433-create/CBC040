document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("chatToggle");
    const panel = document.getElementById("chatPanel");
    const close = document.getElementById("chatClose");
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const messages = document.getElementById("chatMessages");
    const status = document.getElementById("chatStatus");
    const sendButton = document.getElementById("chatSendBtn");
    const voiceInput = document.getElementById("voiceInputBtn");
    const voiceOutput = document.getElementById("voiceOutputBtn");
    const stopVoice = document.getElementById("stopVoiceBtn");

    // Check that the HTML elements exist.
    if (!toggle || !panel || !close || !form || !input || !messages) {
        console.error("NewsBuddy: One or more chatbot HTML elements are missing.");
        return;
    }

    let voiceEnabled = true;
    let busy = false;
    let recognition = null;
    const history = [];

    // Set the initial state.
    panel.classList.remove("open");
    toggle.style.display = "flex";
    panel.setAttribute("aria-hidden", "true");

    function setStatus(text) {
        if (status) status.textContent = text;
    }

    function openChat() {
        panel.classList.add("open");
        panel.setAttribute("aria-hidden", "false");
        toggle.style.display = "none";

        if (!messages.dataset.greeted) {
            addMessage(
                "assistant",
                "Hi there! 👋 I'm NewsBuddy, your AI assistant.\n\nAsk me about news, technology, science, education, or your article classification project. How can I help you today?"
            );
            messages.dataset.greeted = "true";
        }

        setStatus("Ready");
        setTimeout(() => input.focus(), 100);
    }

    function closeChat() {
        panel.classList.remove("open");
        panel.setAttribute("aria-hidden", "true");
        toggle.style.display = "flex";

        if (recognition) {
            try {
                recognition.stop();
            } catch (_) {}
        }
    }

    function addMessage(sender, text) {
        const bubble = document.createElement("div");
        bubble.className = `chat-message ${sender}`;
        bubble.textContent = text;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
    }

    function speak(text) {
        if (!voiceEnabled || !("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    }

    // The floating button opens the chat.
    toggle.addEventListener("click", openChat);

    // The X button closes the chat.
    close.addEventListener("click", closeChat);

    // Escape closes the chat when it is open.
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && panel.classList.contains("open")) {
            closeChat();
        }
    });

    // Send messages to the Flask backend.
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = input.value.trim();
        if (!message || busy) return;

        addMessage("user", message);
        input.value = "";
        busy = true;

        if (sendButton) sendButton.disabled = true;
        setStatus("NewsBuddy is thinking…");

        const typing = addMessage("assistant", "✦ Thinking…");

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: message,
                    history: history.slice(-10)
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || data.message || `Server error (${response.status})`);
            }

            const answer = data.answer || data.reply || data.response;

            if (!answer) {
                throw new Error("The server returned no answer. Check your Flask /api/chat route.");
            }

            typing.textContent = answer;

            history.push(
                { role: "user", content: message },
                { role: "assistant", content: answer }
            );

            messages.scrollTop = messages.scrollHeight;
            setStatus("Ready");
            speak(answer);
        } catch (error) {
            console.error("NewsBuddy chat error:", error);
            typing.textContent =
                "Sorry! I couldn't connect to the AI service. Please check that Flask is running and your /api/chat endpoint and API key are configured correctly.";
            setStatus("Connection problem — check the Flask terminal.");
        } finally {
            busy = false;
            if (sendButton) sendButton.disabled = false;
            input.focus();
        }
    });

    // Toggle spoken replies.
    if (voiceOutput) {
        voiceOutput.addEventListener("click", () => {
            voiceEnabled = !voiceEnabled;
            voiceOutput.textContent = voiceEnabled
                ? "🔊 Voice: On"
                : "🔇 Voice: Off";

            if (!voiceEnabled && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }

            setStatus(voiceEnabled ? "Voice replies enabled." : "Voice replies disabled.");
        });
    }

    // Stop any current spoken reply.
    if (stopVoice) {
        stopVoice.addEventListener("click", () => {
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
            setStatus("Voice stopped.");
        });
    }

    // Voice input, supported in Chrome and some other browsers.
    if (voiceInput) {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            voiceInput.addEventListener("click", () => {
                setStatus("Voice input is not supported by this browser. Try Google Chrome.");
            });
        } else {
            recognition = new SpeechRecognition();
            recognition.lang = "en-IN";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            voiceInput.addEventListener("click", () => {
                try {
                    recognition.start();
                    setStatus("Listening… Speak now.");
                    voiceInput.textContent = "🎙 Listening…";
                } catch (error) {
                    setStatus("Microphone is already active. Please try again.");
                }
            });

            recognition.onresult = (event) => {
                input.value = event.results[0][0].transcript;
                input.focus();
                setStatus("Speech captured. Press Send.");
            };

            recognition.onerror = (event) => {
                setStatus(
                    event.error === "not-allowed"
                        ? "Microphone permission denied. Allow microphone access in your browser."
                        : `Voice input error: ${event.error}`
                );
            };

            recognition.onend = () => {
                voiceInput.textContent = "🎤 Speak";
            };
        }
    }

    console.log("NewsBuddy initialized successfully.");
});