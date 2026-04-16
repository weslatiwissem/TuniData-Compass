# ============================================================
# cv_parser.py  (v2 — with stopword filter)
# ============================================================

import re
import fitz  # pymupdf

TOKEN_RE = re.compile(r"[^\s]+")

# Generic words that appear in TF-IDF vocab but are NOT skills
NON_SKILL_WORDS = {
    "-", "a", "an", "the", "and", "or", "of", "in", "to", "for",
    "with", "on", "at", "by", "from", "as", "is", "are", "be",
    "experience", "skills", "skill", "knowledge", "ability", "abilities",
    "application", "applications", "development", "delivery", "management",
    "service", "services", "system", "systems", "technology", "technologies",
    "solution", "solutions", "platform", "platforms", "tool", "tools",
    "business", "digital", "computer", "research", "science", "engineering",
    "detection", "user", "web", "data", "ai", "learning", "machine",
    "cloud", "security", "network", "software", "hardware", "design",
    "analysis", "analytics", "product", "project", "process", "processes",
    "communication", "testing", "test", "support", "integration",
    "implementation", "deployment", "monitoring", "performance",
    "architecture", "infrastructure", "environment", "environments",
    "framework", "frameworks", "library", "libraries", "language",
    "model", "models", "algorithm", "algorithms", "pipeline", "pipelines",
    "database", "databases", "server", "servers", "client", "clients",
    "interface", "interfaces", "protocol", "protocols", "standard",
    "strong", "good", "excellent", "proficient", "understanding",
    "working", "work", "team", "teams", "lead", "leading", "manage",
    "build", "building", "develop", "developing", "implement",
    "write", "writing", "code", "coding", "program", "programming",
    "technical", "year", "years", "plus", "minimum", "least",
    "b", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
}

# Real skills that look like common words — always keep these
SKILL_WHITELIST = {
    "python", "sql", "java", "javascript", "typescript", "php", "ruby",
    "swift", "kotlin", "scala", "rust", "go", "golang", "perl",
    "r", "c", "matlab", "bash", "shell",
    "react", "angular", "vue", "django", "flask", "fastapi", "spring",
    "laravel", "rails", "express", "nextjs", "nuxtjs",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "sqlite", "oracle", "cassandra", "dynamodb", "firebase",
    "docker", "kubernetes", "terraform", "ansible", "jenkins",
    "git", "github", "gitlab", "bitbucket",
    "aws", "azure", "gcp", "linux", "nginx", "apache",
    "pandas", "numpy", "scipy", "sklearn", "tensorflow", "pytorch",
    "keras", "xgboost", "opencv", "nltk", "spacy",
    "spark", "hadoop", "kafka", "airflow", "dbt", "snowflake",
    "tableau", "powerbi", "grafana", "kibana",
    "html", "css", "sass", "webpack", "vite",
    "selenium", "pytest", "jest", "cypress",
    "nlp", "ml", "ai", "devops", "mlops",
    "jira", "confluence", "figma", "photoshop",
    "excel", "word", "powerpoint",
}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        doc   = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        return " ".join(pages)
    except Exception as e:
        raise ValueError(f"Could not read PDF: {e}")


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s/.\+\#\-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def is_real_skill(term: str) -> bool:
    term = term.strip().lower()
    if term in SKILL_WHITELIST:
        return True
    if term in NON_SKILL_WORDS:
        return False
    if len(term) <= 1:
        return False
    if term.isdigit():
        return False
    return True


def extract_skills_from_text(text: str, known_vocab: set) -> list[str]:
    cleaned = clean_text(text)
    tokens  = TOKEN_RE.findall(cleaned)
    found   = set()
    n = len(tokens)

    for i in range(n):
        w1 = tokens[i]

        if w1 in known_vocab and is_real_skill(w1):
            found.add(w1)

        if i + 1 < n:
            w2 = w1 + " " + tokens[i + 1]
            if w2 in known_vocab and is_real_skill(w2):
                found.add(w2)

        if i + 2 < n:
            w3 = w1 + " " + tokens[i + 1] + " " + tokens[i + 2]
            if w3 in known_vocab and is_real_skill(w3):
                found.add(w3)

    return sorted(found)


def parse_cv(file_bytes: bytes, known_vocab: set) -> dict:
    text   = extract_text_from_pdf(file_bytes)
    skills = extract_skills_from_text(text, known_vocab)
    return {
        "extracted_skills": skills,
        "count"           : len(skills),
        "text_length"     : len(text),
    }


def parse_free_text(text: str, known_vocab: set) -> dict:
    skills = extract_skills_from_text(text, known_vocab)
    return {
        "extracted_skills": skills,
        "count"           : len(skills),
    }