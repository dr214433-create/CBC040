from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
from openai import OpenAI

# Find the main project folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load the secret API key from the .env file
load_dotenv(os.path.join(BASE_DIR, ".env"))

# DEBUG CHECK: These lines do not reveal your API key
print("ENV FILE PATH:", os.path.join(BASE_DIR, ".env"))
print("API KEY LOADED:", bool(os.getenv("OPENAI_API_KEY")))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)

# Connect to OpenAI using the private API key
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None


@app.route("/")
def home():
    return render_template("index.html")


# ORIGINAL ARTICLE CLASSIFIER
@app.route("/api/classify", methods=["POST"])
def classify_article():
    data = request.get_json(silent=True) or {}
    article = data.get("article", "").strip()

    if not article:
        return jsonify({"error": "Please enter an article."}), 400

    article = article.lower()

    categories = {
        "Technology": [
            "technology", "artificial intelligence",
            "software", "computer", "robot"
        ],
        "Healthcare": [
            "health", "doctor", "hospital",
            "medicine", "healthcare"
        ],
        "Education": [
            "education", "school", "student",
            "college", "university"
        ],
        "Business": [
            "business", "company", "market",
            "profit", "economy"
        ],
        "Politics": [
            "government", "election", "minister",
            "politics", "parliament"
        ],
        "Science": [
            "science", "research", "experiment",
            "scientist", "discovery"
        ]
    }

    scores = {
        category: sum(article.count(word) for word in keywords)
        for category, keywords in categories.items()
    }

    best_category = max(scores, key=scores.get)
    best_score = scores[best_category]
    total_score = sum(scores.values())

    if best_score == 0:
        category = "Uncategorized"
        confidence = 0
    else:
        category = best_category
        confidence = round(best_score / total_score * 100, 2)

    return jsonify({
        "category": category,
        "confidence": confidence,
        "details": "Classification completed using keyword matching."
    })


# NEW AI CHATBOT
@app.route("/api/chat", methods=["POST"])
def chat():
    if client is None:
        return jsonify({
            "error": "API key missing. Check the .env file."
        }), 503

    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "Please type a question."}), 400

    if len(message) > 4000:
        return jsonify({
            "error": "Please keep your question under 4,000 characters."
        }), 400

    messages = [
        {
            "role": "developer",
            "content": (
                "You are NewsBuddy, a friendly AI chatbot inside a "
                "News Article Classification System. Answer a wide range "
                "of general questions clearly. Help with technology, "
                "science, healthcare, education, business, politics, "
                "news topics, and the user's project. Explain difficult "
                "ideas simply. Be honest when uncertain. You do not have "
                "live web access. The article classifier uses keyword "
                "matching and does not verify whether news is true."
            )
        }
    ]

    # Include recent conversation for context
    if isinstance(history, list):
        for item in history[-10:]:
            if not isinstance(item, dict):
                continue

            role = item.get("role")
            content = item.get("content")

            if (
                role in ("user", "assistant")
                and isinstance(content, str)
                and content.strip()
                and len(content) <= 4000
            ):
                messages.append({
                    "role": role,
                    "content": content
                })

    messages.append({
        "role": "user",
        "content": message
    })

    try:
        response = client.responses.create(
            model="gpt-5-mini",
            input=messages,
            max_output_tokens=700
        )

        answer = response.output_text.strip()

        if not answer:
            answer = "Sorry, I could not generate an answer. Please try again."

        return jsonify({"answer": answer})

    except Exception:
        app.logger.exception("NewsBuddy API request failed")
        return jsonify({
            "error": (
                "The AI service could not respond. Check your API key, "
                "API access, model availability, and billing."
            )
        }), 502


if __name__ == "__main__":
    app.run(debug=True)