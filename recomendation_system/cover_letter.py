"""
cover_letter.py — AI-generated tailored cover letters using Gemini
"""
from __future__ import annotations

import os
from typing import Generator
from dotenv import load_dotenv
import google.generativeai as genai

_client = None
load_dotenv()


def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable not set.")
        genai.configure(api_key=api_key)
        _client = genai.GenerativeModel("models/gemini-2.5-flash")
    return _client


def _build_prompt(
    user_name: str,
    user_role: str,
    user_skills: list[str],
    user_bio: str,
    user_experience: list[dict],
    user_education: list[dict],
    job_title: str,
    job_company: str,
    job_location: str,
    job_description: str,
    job_skills: list[str],
    matched_skills: list[str],
) -> str:
    exp_lines = []
    for exp in (user_experience or [])[:3]:
        line = f"- {exp.get('title', 'Role')} at {exp.get('company', 'Company')}"
        if exp.get('period'):
            line += f" ({exp['period']})"
        if exp.get('desc'):
            line += f": {exp['desc'][:150]}"
        exp_lines.append(line)
    exp_text = "\n".join(exp_lines) if exp_lines else "No experience listed."

    edu_lines = []
    for edu in (user_education or [])[:2]:
        line = f"- {edu.get('degree', 'Degree')}"
        if edu.get('institution'):
            line += f" from {edu['institution']}"
        if edu.get('period'):
            line += f" ({edu['period']})"
        edu_lines.append(line)
    edu_text = "\n".join(edu_lines) if edu_lines else "No education listed."

    skills_text     = ", ".join(user_skills[:20])   if user_skills    else "Not specified"
    matched_text    = ", ".join(matched_skills[:10]) if matched_skills else "None listed"
    job_skills_text = ", ".join(job_skills[:15])     if job_skills     else "Not specified"

    return f"""You are an expert career coach and professional writer specializing in the Tunisian job market.

Write a compelling, personalized cover letter for:

CANDIDATE:
- Name: {user_name}
- Current/Target Role: {user_role}
- Bio: {user_bio or 'Not provided'}
- Skills: {skills_text}
- Matched skills for this job: {matched_text}

EXPERIENCE:
{exp_text}

EDUCATION:
{edu_text}

JOB THEY ARE APPLYING TO:
- Title: {job_title}
- Company: {job_company}
- Location: {job_location}
- Job Description: {job_description[:600] if job_description else 'Not provided'}
- Required Skills: {job_skills_text}

INSTRUCTIONS:
1. Make it genuinely personal — reference their ACTUAL experience and skills
2. Explicitly connect their background to THIS specific role and company
3. Mention 2-3 specific matched skills naturally in context
4. Be professional but warm — avoid generic boilerplate
5. Length: 3-4 focused paragraphs (250-350 words)
6. Start with "Dear {job_company} Team,"
7. End with "Sincerely," and the candidate's name
8. Do NOT include address blocks, dates, or [placeholder] text
9. Make it sound like a real person wrote it, not a template

Write ONLY the cover letter text, nothing else."""


def generate_cover_letter(
    user_name: str,
    user_role: str,
    user_skills: list[str],
    user_bio: str,
    user_experience: list[dict],
    user_education: list[dict],
    job_title: str,
    job_company: str,
    job_location: str,
    job_description: str,
    job_skills: list[str],
    matched_skills: list[str],
) -> str:
    """Generate a tailored cover letter. Returns the full text."""
    client = get_client()

    prompt = _build_prompt(
        user_name, user_role, user_skills, user_bio,
        user_experience, user_education,
        job_title, job_company, job_location,
        job_description, job_skills, matched_skills,
    )

    response = client.generate_content(prompt)

    return response.text.strip()


def generate_cover_letter_stream(
    user_name: str,
    user_role: str,
    user_skills: list[str],
    user_bio: str,
    user_experience: list[dict],
    user_education: list[dict],
    job_title: str,
    job_company: str,
    job_location: str,
    job_description: str,
    job_skills: list[str],
    matched_skills: list[str],
) -> Generator[str, None, None]:
    """Generator that yields cover letter text chunks for streaming."""
    client = get_client()

    prompt = _build_prompt(
        user_name, user_role, user_skills, user_bio,
        user_experience, user_education,
        job_title, job_company, job_location,
        job_description, job_skills, matched_skills,
    )

    response = client.generate_content(prompt, stream=True)

    for chunk in response:
        if chunk.text:
            yield chunk.text