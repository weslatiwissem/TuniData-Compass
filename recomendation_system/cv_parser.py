"""
cv_parser.py — Enhanced CV parser with structured section extraction
Extracts: skills, experience, education, languages, certifications, summary
"""

import re
import fitz  # pymupdf

TOKEN_RE = re.compile(r"[^\s]+")

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

# Section header patterns
SECTION_HEADERS = {
    "experience": re.compile(
        r"(work\s*experience|professional\s*experience|employment|career\s*history|experience)",
        re.IGNORECASE
    ),
    "education": re.compile(
        r"(education|academic\s*background|qualifications|degrees?|studies)",
        re.IGNORECASE
    ),
    "skills": re.compile(
        r"(technical\s*skills|skills|competencies|technologies|expertise)",
        re.IGNORECASE
    ),
    "languages": re.compile(
        r"(languages?|spoken\s*languages?|linguistic\s*skills)",
        re.IGNORECASE
    ),
    "certifications": re.compile(
        r"(certifications?|certificates?|licenses?|accreditations?)",
        re.IGNORECASE
    ),
    "summary": re.compile(
        r"(summary|profile|objective|about\s*me|professional\s*summary|overview)",
        re.IGNORECASE
    ),
}

# Common language patterns
LANGUAGES_RE = re.compile(
    r"\b(english|french|arabic|german|spanish|italian|portuguese|chinese|japanese|"
    r"russian|dutch|turkish|persian|hindi|urdu|tunisian|darija)\b",
    re.IGNORECASE
)

PROFICIENCY_RE = re.compile(
    r"\b(native|fluent|advanced|intermediate|beginner|basic|professional|"
    r"c1|c2|b1|b2|a1|a2|mother\s*tongue)\b",
    re.IGNORECASE
)

# Education degree patterns
DEGREE_RE = re.compile(
    r"\b(bachelor|master|phd|doctorate|licence|ingénieur|engineer|mba|bsc|msc|"
    r"b\.s\.|m\.s\.|b\.e\.|m\.e\.|b\.tech|m\.tech|diplôme|diploma)\b",
    re.IGNORECASE
)

# Date patterns for experience
DATE_RANGE_RE = re.compile(
    r"(\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    r"[\s,]*\d{4}\s*[-–—]\s*"
    r"(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    r"[\s,]*\d{4}|present|current|now)|\d{4}\s*[-–—]\s*(?:\d{4}|present|current|now))",
    re.IGNORECASE
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        return "\n".join(pages)
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
    tokens = TOKEN_RE.findall(cleaned)
    found = set()
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


def split_into_sections(text: str) -> dict[str, str]:
    """Split CV text into named sections based on header detection."""
    lines = text.split("\n")
    sections = {"header": [], "body": {}}
    current_section = "header"
    section_order = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        matched_section = None
        for section_name, pattern in SECTION_HEADERS.items():
            if pattern.match(stripped) and len(stripped) < 60:
                matched_section = section_name
                break

        if matched_section:
            current_section = matched_section
            if matched_section not in sections["body"]:
                sections["body"][matched_section] = []
                section_order.append(matched_section)
        else:
            if current_section == "header":
                sections["header"].append(stripped)
            else:
                if current_section not in sections["body"]:
                    sections["body"][current_section] = []
                sections["body"][current_section].append(stripped)

    return sections


def extract_experience_entries(lines: list[str]) -> list[dict]:
    """Parse experience section into structured job entries."""
    entries = []
    current = {}

    for line in lines:
        if not line.strip():
            continue

        date_match = DATE_RANGE_RE.search(line)
        if date_match:
            if current:
                entries.append(current)
            current = {
                "period": date_match.group(0).strip(),
                "title": "",
                "company": "",
                "desc": line.replace(date_match.group(0), "").strip()[:200],
            }
        elif current:
            if not current.get("title"):
                current["title"] = line[:100]
            elif not current.get("company"):
                current["company"] = line[:100]
            else:
                desc = current.get("desc", "")
                if len(desc) < 300:
                    current["desc"] = (desc + " " + line).strip()[:300]

    if current:
        entries.append(current)

    # Clean and validate
    valid = []
    for e in entries:
        if e.get("title") or e.get("company"):
            valid.append({
                "title": e.get("title", "Role")[:100],
                "company": e.get("company", "")[:100],
                "period": e.get("period", "")[:50],
                "desc": e.get("desc", "")[:300],
            })

    return valid[:10]


def extract_education_entries(lines: list[str]) -> list[dict]:
    """Parse education section into structured entries."""
    entries = []
    current = {}

    for line in lines:
        if not line.strip():
            continue

        degree_match = DEGREE_RE.search(line)
        date_match = DATE_RANGE_RE.search(line)

        if degree_match or (date_match and not current):
            if current:
                entries.append(current)
            current = {
                "degree": line[:150],
                "institution": "",
                "period": date_match.group(0) if date_match else "",
                "field": "",
            }
        elif current:
            if not current.get("institution"):
                current["institution"] = line[:100]
            elif not current.get("period") and date_match:
                current["period"] = date_match.group(0)

    if current:
        entries.append(current)

    valid = []
    for e in entries:
        if e.get("degree"):
            valid.append({
                "degree": e.get("degree", "")[:150],
                "institution": e.get("institution", "")[:100],
                "period": e.get("period", "")[:50],
                "field": e.get("field", "")[:100],
            })

    return valid[:6]


def extract_languages(text: str) -> list[str]:
    """Extract language mentions with proficiency levels."""
    langs_found = []
    lines = text.split("\n")

    for line in lines:
        lang_match = LANGUAGES_RE.findall(line)
        if lang_match:
            prof_match = PROFICIENCY_RE.findall(line)
            for lang in lang_match:
                lang_entry = lang.capitalize()
                if prof_match:
                    lang_entry += f" ({prof_match[0].capitalize()})"
                if lang_entry not in langs_found:
                    langs_found.append(lang_entry)

    return langs_found[:8]


def extract_certifications(lines: list[str]) -> list[str]:
    """Extract certification names."""
    certs = []
    for line in lines:
        stripped = line.strip()
        if stripped and len(stripped) > 5 and len(stripped) < 200:
            certs.append(stripped)
    return certs[:10]


def extract_summary(header_lines: list[str], summary_lines: list[str]) -> str:
    """Build a summary from header or summary section."""
    # Try dedicated summary section first
    if summary_lines:
        combined = " ".join(summary_lines[:5])
        if len(combined) > 30:
            return combined[:500]

    # Fall back to header lines that look like prose (not name/contact)
    prose_lines = []
    for line in header_lines:
        if (len(line) > 40 and
                not re.search(r'@|tel:|phone:|email:|linkedin|github|http', line, re.IGNORECASE) and
                not re.match(r'^\+?\d', line)):
            prose_lines.append(line)

    if prose_lines:
        return " ".join(prose_lines[:3])[:500]

    return ""


def parse_cv_full(file_bytes: bytes, known_vocab: set) -> dict:
    """
    Full CV parse returning:
    - extracted_skills
    - profile_sections (experience, education, languages, certifications, summary)
    - raw text length
    """
    text = extract_text_from_pdf(file_bytes)
    skills = extract_skills_from_text(text, known_vocab)

    sections_raw = split_into_sections(text)
    body = sections_raw.get("body", {})
    header = sections_raw.get("header", [])

    experience = extract_experience_entries(body.get("experience", []))
    education = extract_education_entries(body.get("education", []))
    languages = extract_languages(text)
    certifications = extract_certifications(body.get("certifications", []))
    summary = extract_summary(header, body.get("summary", []))

    return {
        "extracted_skills": skills,
        "count": len(skills),
        "text_length": len(text),
        "profile_sections": {
            "summary": summary,
            "experience": experience,
            "education": education,
            "languages": languages,
            "certifications": certifications,
        },
    }


def parse_cv(file_bytes: bytes, known_vocab: set) -> dict:
    """Legacy compatibility — returns just skills."""
    result = parse_cv_full(file_bytes, known_vocab)
    return {
        "extracted_skills": result["extracted_skills"],
        "count": result["count"],
        "text_length": result["text_length"],
    }


def parse_free_text(text: str, known_vocab: set) -> dict:
    skills = extract_skills_from_text(text, known_vocab)
    return {
        "extracted_skills": skills,
        "count": len(skills),
    }
