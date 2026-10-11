document.addEventListener("DOMContentLoaded", () => {
    const articleList = document.getElementById("articleList");
    const addArticleBtn = document.getElementById("addArticleBtn");
    const classifyAllBtn = document.getElementById("classifyAllBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const status = document.getElementById("status");
    const resultsList = document.getElementById("resultsList");

    const totalCount = document.getElementById("totalCount");
    const classifiedCount = document.getElementById("classifiedCount");
    const pendingCount = document.getElementById("pendingCount");
    const categoryCount = document.getElementById("categoryCount");

    const resultSummary = document.getElementById("resultSummary");
    const summaryText = document.getElementById("summaryText");
    const categoryBreakdown = document.getElementById("categoryBreakdown");

    let nextArticleId = 2;
    let results = [];

    function getArticleCards() {
        return [...articleList.querySelectorAll(".article-input-card")];
    }

    function countWords(text) {
        const trimmed = text.trim();
        return trimmed ? trimmed.split(/\s+/).length : 0;
    }

    function updateWordCount(card) {
        const text = card.querySelector(".article-text").value;
        card.querySelector(".word-count").textContent =
            `${countWords(text)} words`;
    }

    function updateArticleHeadings() {
        const cards = getArticleCards();

        cards.forEach((card, index) => {
            card.querySelector("h3").textContent = `Article ${index + 1}`;
            card.querySelector(".article-title").setAttribute(
                "aria-label",
                `Article ${index + 1} title`
            );
            card.querySelector(".article-text").setAttribute(
                "aria-label",
                `Article ${index + 1} content`
            );

            const removeButton = card.querySelector(".remove-article-btn");
            removeButton.disabled = cards.length === 1;
        });

        totalCount.textContent = cards.length;
        pendingCount.textContent = cards.filter(card =>
            card.querySelector(".article-text").value.trim()
        ).length;
    }

    function createArticleCard() {
        const card = document.createElement("article");
        card.className = "article-input-card";

        const heading = document.createElement("div");
        heading.className = "article-card-heading";

        const title = document.createElement("h3");
        title.textContent = `Article ${getArticleCards().length + 1}`;

        const state = document.createElement("span");
        state.className = "article-state";
        state.textContent = "Ready to classify";

        heading.append(title, state);

        const titleInput = document.createElement("input");
        titleInput.className = "article-title";
        titleInput.type = "text";
        titleInput.placeholder = "Article title (optional)";
        titleInput.maxLength = 200;

        const textarea = document.createElement("textarea");
        textarea.className = "article-text";
        textarea.placeholder = "Paste the full article here...";
        textarea.rows = 7;

        const footer = document.createElement("div");
        footer.className = "article-card-footer";

        const wordCount = document.createElement("span");
        wordCount.className = "word-count";
        wordCount.textContent = "0 words";

        const removeButton = document.createElement("button");
        removeButton.className = "remove-article-btn";
        removeButton.type = "button";
        removeButton.textContent = "Remove";

        footer.append(wordCount, removeButton);
        card.append(heading, titleInput, textarea, footer);

        return card;
    }

    function updateDashboard() {
        const cards = getArticleCards();
        const nonEmpty = cards.filter(card =>
            card.querySelector(".article-text").value.trim()
        );

        totalCount.textContent = cards.length;
        pendingCount.textContent = nonEmpty.length;

        classifiedCount.textContent = results.length;
        categoryCount.textContent =
            new Set(results.map(item => item.category)).size;

        updateArticleHeadings();
    }

    function showEmptyResults() {
        resultsList.replaceChildren();

        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "▤";

        const heading = document.createElement("h3");
        heading.textContent = "Your results will appear here";

        const paragraph = document.createElement("p");
        paragraph.textContent =
            "Add articles above and click “Classify All Articles”.";

        empty.append(icon, heading, paragraph);
        resultsList.appendChild(empty);

        resultSummary.classList.add("hidden");
    }

    function renderResults() {
        resultsList.replaceChildren();

        if (results.length === 0) {
            showEmptyResults();
            updateDashboard();
            return;
        }

        const counts = {};

        results.forEach((item, index) => {
            counts[item.category] = (counts[item.category] || 0) + 1;

            const card = document.createElement("article");
            card.className = "classification-card";

            const top = document.createElement("div");
            top.className = "result-card-top";

            const number = document.createElement("span");
            number.className = "result-number";
            number.textContent = `RESULT ${index + 1}`;

            const badge = document.createElement("span");
            badge.className = "category-badge";
            badge.textContent = item.category;

            top.append(number, badge);

            const heading = document.createElement("h3");
            heading.textContent = item.title || `Article ${index + 1}`;

            const categoryLabel = document.createElement("p");
            categoryLabel.className = "result-label";
            categoryLabel.textContent = "Predicted category";

            const category = document.createElement("div");
            category.className = "result-category";
            category.textContent = item.category;

            card.append(top, heading, categoryLabel, category);

            if (item.confidence !== undefined && item.confidence !== null) {
                const confidence = document.createElement("p");
                confidence.className = "result-detail";
                confidence.textContent =
                    `Confidence: ${item.confidence}`;
                card.appendChild(confidence);
            }

            if (item.details) {
                const details = document.createElement("p");
                details.className = "result-detail";
                details.textContent = item.details;
                card.appendChild(details);
            }

            resultsList.appendChild(card);
        });

        resultSummary.classList.remove("hidden");
        summaryText.textContent =
            `${results.length} article(s) classified successfully across ` +
            `${Object.keys(counts).length} category/categories.`;

        categoryBreakdown.replaceChildren();

        Object.entries(counts).forEach(([category, count]) => {
            const chip = document.createElement("span");
            chip.className = "breakdown-chip";
            chip.textContent = `${category}: ${count}`;
            categoryBreakdown.appendChild(chip);
        });

        updateDashboard();
    }

    addArticleBtn.addEventListener("click", () => {
        if (getArticleCards().length >= 20) {
            status.textContent = "You can add up to 20 articles per batch.";
            return;
        }

        const card = createArticleCard();
        articleList.appendChild(card);
        nextArticleId++;

        updateArticleHeadings();
        status.textContent = "New article box added.";
        card.querySelector(".article-title").focus();
    });

    articleList.addEventListener("input", event => {
        const card = event.target.closest(".article-input-card");
        if (!card) return;

        if (event.target.classList.contains("article-text")) {
            updateWordCount(card);
        }

        card.querySelector(".article-state").textContent = "Not yet classified";
        updateDashboard();
    });

    articleList.addEventListener("click", event => {
        const button = event.target.closest(".remove-article-btn");
        if (!button || button.disabled) return;

        button.closest(".article-input-card").remove();
        updateArticleHeadings();

        status.textContent = "Article removed.";
    });

    clearAllBtn.addEventListener("click", () => {
        const firstCard = getArticleCards()[0];

        articleList.replaceChildren();

        const freshCard = createArticleCard();
        articleList.appendChild(freshCard);

        results = [];
        showEmptyResults();
        updateDashboard();

        status.textContent = "All articles and results cleared.";
    });

    classifyAllBtn.addEventListener("click", async () => {
        const cards = getArticleCards();

        const articles = cards.map((card, index) => ({
            title: card.querySelector(".article-title").value.trim(),
            text: card.querySelector(".article-text").value.trim(),
            index
        })).filter(article => article.text.length > 0);

        if (articles.length === 0) {
            status.textContent = "Please enter at least one article first.";
            return;
        }

        classifyAllBtn.disabled = true;
        classifyAllBtn.textContent = "Classifying articles...";
        status.textContent = `Processing ${articles.length} article(s)...`;

        results = [];
        renderResults();

        let succeeded = 0;
        let failed = 0;

        for (const article of articles) {
            const card = cards[article.index];
            const state = card.querySelector(".article-state");
            state.textContent = "Classifying...";

            try {
                const response = await fetch("/api/classify", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        article: article.text
                    })
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || `Server error ${response.status}`);
                }

                // Supports the existing backend's common response fields.
                const category =
                    data.category || data.predicted_category || data.prediction;

                if (!category) {
                    throw new Error("The server did not return a category.");
                }

                results.push({
                    title: article.title,
                    category: String(category),
                    confidence: data.confidence,
                    details: data.details || data.explanation || ""
                });

                state.textContent = `Classified: ${category}`;
                succeeded++;
            } catch (error) {
                state.textContent = "Classification failed";
                failed++;

                const errorCard = document.createElement("p");
                errorCard.className = "classification-error";
                errorCard.textContent =
                    `Could not classify this article: ${error.message}`;
                card.appendChild(errorCard);
            }

            renderResults();
        }

        status.textContent =
            `Finished: ${succeeded} classified, ${failed} failed.`;

        classifyAllBtn.disabled = false;
        classifyAllBtn.textContent = "✦ Classify All Articles";
    });

    // Initialise the dashboard.
    getArticleCards().forEach(updateWordCount);
    updateArticleHeadings();
    updateDashboard();
});