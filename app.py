"""
Portal del Inversor — Provalix (PVX)

KYC data collection webapp: investors upload legal documents,
data is extracted via LLM, reviewed in a form, and stored as JSON.

Run:
    streamlit run app.py
"""

import json
import os
import sys
import tempfile
from pathlib import Path

import pandas as pd
import streamlit as st

SCRIPTS_DIR = Path(__file__).resolve().parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from agente_inversor import extraer_texto_pdf, extraer_con_llm
from kyc_utils import guardar_kyc, validar_kyc, KYC_OUTPUT_DIR

# ── Page config ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Portal del Inversor — Provalix",
    page_icon="briefcase",
    layout="centered",
)

# ── CSS ──────────────────────────────────────────────────────────────────────

st.markdown("""
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
<style>
    /* ── Provalix Brand Tokens ──
       Navy:  #233348  (logo PROVALIX, header bg, primary buttons, dark text)
       Teal:  #3ABFC2  (logo HOMES, active accents, subtle highlights)
       Light: #f8f9fb  (page bg)
    */

    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-dot {
        0%, 100% { box-shadow: 0 0 0 0 rgba(58, 191, 194, 0.45); }
        50%      { box-shadow: 0 0 0 8px rgba(58, 191, 194, 0); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* ── Global typography ── */
    html, body, .stApp, .stMarkdown, .stTextInput label, .stTextArea label,
    .stNumberInput label, .stSelectbox label, .stFileUploader label,
    .stButton > button, .stFormSubmitButton > button,
    [data-testid="stFileUploader"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    .font-display {
        font-family: 'Playfair Display', Georgia, serif !important;
    }

    .block-container {
        padding-top: 0; padding-bottom: 2rem; max-width: 860px;
        animation: fadeInUp 0.5s ease-out;
    }

    /* ── Dark navy header bar — full bleed ── */
    .brand-bar {
        background: linear-gradient(135deg, #1a2738 0%, #233348 50%, #2a3f5a 100%);
        margin: -1rem calc(-50vw + 50%) 0 calc(-50vw + 50%);
        padding: 1.25rem calc(50vw - 50% + 2rem);
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 0;
        box-shadow: 0 2px 12px rgba(35, 51, 72, 0.15);
    }
    .brand-bar svg { height: 28px; width: auto; }
    .brand-tag {
        font-size: 0.68rem; font-weight: 500; color: #3ABFC2;
        text-transform: uppercase; letter-spacing: 0.12em;
        border: 1px solid rgba(58, 191, 194, 0.35);
        padding: 0.35rem 0.85rem;
        border-radius: 4px;
        backdrop-filter: blur(4px);
    }

    /* ── Hero / subtitle ── */
    .hero-section {
        background: linear-gradient(180deg, rgba(35,51,72,0.04) 0%, transparent 100%);
        margin: 0 calc(-50vw + 50%);
        padding: 2rem calc(50vw - 50% + 2rem) 1.5rem;
    }
    .hero-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.75rem; font-weight: 600; color: #233348;
        margin: 0 0 0.5rem 0; line-height: 1.3;
    }
    .hero-subtitle {
        color: #6b7280; font-size: 0.92rem; line-height: 1.6;
        margin: 0;
    }

    /* ── Process overview cards ── */
    .process-cards {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 1rem; margin: 1.5rem 0 2rem 0;
    }
    .process-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.25rem;
        text-align: center;
        transition: all 0.2s ease;
    }
    .process-card:hover {
        border-color: #3ABFC2;
        box-shadow: 0 4px 12px rgba(58, 191, 194, 0.1);
        transform: translateY(-2px);
    }
    .process-card-icon {
        width: 48px; height: 48px;
        background: linear-gradient(135deg, #eef8f9, #d4f1f2);
        border-radius: 12px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 1.3rem;
        margin-bottom: 0.75rem;
    }
    .process-card-title {
        font-size: 0.82rem; font-weight: 600; color: #233348;
        margin-bottom: 0.3rem;
    }
    .process-card-desc {
        font-size: 0.75rem; color: #9ca3af; line-height: 1.4;
    }

    /* ── Step bar ── */
    .step-bar {
        display: flex; gap: 0; margin-bottom: 2rem;
        background: white;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .step-item {
        flex: 1; text-align: center; padding: 0.75rem 0.25rem;
        border-bottom: 3px solid transparent; color: #9ca3af;
        font-size: 0.78rem; font-weight: 500; transition: all 0.3s ease;
        background: transparent;
    }
    .step-item.active {
        border-bottom-color: #3ABFC2; color: #233348; font-weight: 600;
        background: rgba(58, 191, 194, 0.04);
    }
    .step-item.done {
        border-bottom-color: #233348; color: #233348;
        background: rgba(35, 51, 72, 0.03);
    }
    .step-num {
        display: inline-flex; align-items: center; justify-content: center;
        width: 1.4rem; height: 1.4rem;
        background: #e5e7eb; color: #6b7280;
        font-size: 0.7rem; font-weight: 700; margin-right: 0.4rem;
        vertical-align: middle;
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    .step-item.active .step-num {
        background: #3ABFC2; color: white;
        box-shadow: 0 2px 8px rgba(58, 191, 194, 0.3);
    }
    .step-item.done .step-num { background: #233348; color: white; }

    /* ── Section headers ── */
    .section-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.3rem; font-weight: 600; color: #233348;
        margin-bottom: 0.25rem;
    }
    .section-desc {
        font-size: 0.85rem; color: #6b7280; margin-bottom: 1.25rem;
        line-height: 1.5;
    }

    /* ── Upload area ── */
    [data-testid="stFileUploader"] {
        border: 2px dashed #d1d5db !important;
        border-radius: 12px !important;
        padding: 1rem !important;
        background: #fafbfc !important;
        transition: all 0.2s ease !important;
    }
    [data-testid="stFileUploader"]:hover {
        border-color: #3ABFC2 !important;
        background: rgba(58, 191, 194, 0.03) !important;
    }

    /* ── Recommended docs cards ── */
    .rec-docs {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 0.6rem; margin: 1rem 0 1.5rem 0;
    }
    .rec-doc {
        display: flex; align-items: center; gap: 0.6rem;
        padding: 0.7rem 0.9rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.82rem; color: #374151;
        transition: all 0.15s ease;
    }
    .rec-doc:hover {
        border-color: #3ABFC2;
        background: #f0fafb;
    }
    .rec-doc-icon {
        width: 32px; height: 32px;
        background: #f3f4f6;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.9rem; flex-shrink: 0;
    }

    /* ── Buttons — rounded, polished ── */
    .stButton > button[kind="primary"],
    .stFormSubmitButton > button[kind="primary"] {
        background: linear-gradient(135deg, #233348 0%, #2d4562 100%) !important;
        border-color: #233348 !important;
        color: white !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        letter-spacing: 0.03em !important;
        text-transform: uppercase !important;
        font-size: 0.82rem !important;
        padding: 0.7rem 1.5rem !important;
        transition: all 0.25s ease !important;
        box-shadow: 0 2px 8px rgba(35, 51, 72, 0.2) !important;
    }
    .stButton > button[kind="primary"]:hover,
    .stFormSubmitButton > button[kind="primary"]:hover {
        background: linear-gradient(135deg, #2d4562 0%, #3a5a7a 100%) !important;
        box-shadow: 0 4px 16px rgba(35, 51, 72, 0.3) !important;
        transform: translateY(-1px) !important;
    }
    .stButton > button[kind="secondary"] {
        border-radius: 8px !important;
        border-color: #d1d5db !important;
        color: #374151 !important;
        font-weight: 500 !important;
        font-size: 0.82rem !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button[kind="secondary"]:hover {
        background-color: #f3f4f6 !important;
        border-color: #9ca3af !important;
    }
    div[data-testid="stDownloadButton"] > button {
        width: 100%; border-radius: 8px !important;
        border: 1.5px solid #233348 !important; color: #233348 !important;
        font-weight: 600 !important; text-transform: uppercase !important;
        font-size: 0.8rem !important; letter-spacing: 0.03em !important;
        padding: 0.7rem 1.5rem !important;
        transition: all 0.2s ease !important;
    }
    div[data-testid="stDownloadButton"] > button:hover {
        background-color: #233348 !important; color: white !important;
    }

    /* ── Tabs — teal underline accent ── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 0;
        background: white;
        border-radius: 10px 10px 0 0;
        border: 1px solid #e5e7eb;
        border-bottom: none;
        padding: 0 0.5rem;
    }
    .stTabs [data-baseweb="tab"] {
        font-size: 0.8rem !important; font-weight: 500 !important;
        color: #6b7280 !important; padding: 0.7rem 0.9rem !important;
        transition: color 0.2s ease !important;
    }
    .stTabs [aria-selected="true"] {
        color: #233348 !important; font-weight: 600 !important;
        border-bottom-color: #3ABFC2 !important;
    }
    .stTabs [data-baseweb="tab-highlight"] {
        background-color: #3ABFC2 !important;
    }
    .stTabs [data-baseweb="tab-panel"] {
        background: white;
        border: 1px solid #e5e7eb;
        border-top: none;
        border-radius: 0 0 10px 10px;
        padding: 1.5rem;
    }

    /* ── Auto-extracted badge ── */
    .extracted-badge {
        display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.68rem; font-weight: 500;
        color: #3ABFC2;
        background: #eef8f9;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        margin-left: 0.4rem;
        vertical-align: middle;
    }

    /* ── Processing steps (vertical) ── */
    .proc-steps { margin: 2rem 0; }
    .proc-step {
        display: flex; align-items: flex-start; gap: 1rem;
        padding: 0.9rem 0; position: relative;
    }
    .proc-step:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 15px; top: 42px; bottom: 0;
        width: 2px;
        background: #e5e7eb;
    }
    .proc-step.done:not(:last-child)::after { background: #233348; }
    .proc-step.active:not(:last-child)::after { background: linear-gradient(180deg, #3ABFC2 0%, #e5e7eb 100%); }
    .proc-dot {
        width: 32px; height: 32px; flex-shrink: 0;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem; font-weight: 700;
        background: #f3f4f6; color: #9ca3af;
        transition: all 0.3s ease;
        position: relative; z-index: 1;
    }
    .proc-step.active .proc-dot {
        background: #3ABFC2; color: white;
        animation: pulse-dot 2s infinite;
    }
    .proc-step.done .proc-dot { background: #233348; color: white; }
    .proc-label {
        font-size: 0.88rem; font-weight: 500; color: #9ca3af;
        padding-top: 0.35rem;
    }
    .proc-step.active .proc-label { color: #233348; font-weight: 600; }
    .proc-step.done .proc-label { color: #233348; }

    /* ── Result cards ── */
    .result-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 1rem; margin-bottom: 1.5rem;
    }
    .result-card {
        background: white; border: 1px solid #e5e7eb;
        border-radius: 12px; padding: 1.25rem 1.5rem;
        transition: all 0.2s ease;
    }
    .result-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .result-card.highlight {
        background: linear-gradient(135deg, #eef8f9 0%, #e0f5f6 100%);
        border-color: #3ABFC2;
        border-left: 4px solid #3ABFC2;
    }
    .result-label {
        font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 0.35rem;
    }
    .result-value {
        font-size: 1rem; font-weight: 600; color: #233348; word-break: break-word;
    }

    /* ── Success section (Step 4) ── */
    .success-section {
        text-align: center;
        padding: 2.5rem 1rem;
        animation: fadeInUp 0.6s ease-out;
    }
    .success-icon-big {
        width: 80px; height: 80px;
        background: linear-gradient(135deg, #d4f1f2, #eef8f9);
        border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 2.2rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 8px 24px rgba(58, 191, 194, 0.15);
    }
    .success-heading {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.6rem; font-weight: 600; color: #233348;
        margin-bottom: 0.5rem;
    }
    .success-subtext {
        color: #6b7280; font-size: 0.92rem; line-height: 1.5;
        margin-bottom: 2rem;
        max-width: 420px; margin-left: auto; margin-right: auto;
    }

    /* ── Security note ── */
    .security-note {
        display: flex; align-items: center; gap: 0.6rem;
        background: #f8f9fb; border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-top: 1.5rem;
    }
    .security-note-icon {
        font-size: 1.1rem; flex-shrink: 0; color: #3ABFC2;
    }
    .security-note-text {
        font-size: 0.78rem; color: #6b7280; line-height: 1.4;
    }

    /* ── Misc ── */
    .divider-subtle { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
    .footer-note {
        text-align: center; color: #9ca3af; font-size: 0.75rem;
        margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;
    }
    .doc-list-item {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.6rem 0.9rem;
        background: white; border: 1px solid #e5e7eb; border-radius: 8px;
        font-size: 0.85rem; color: #233348; margin-bottom: 0.5rem;
        transition: all 0.15s ease;
    }
    .doc-list-item:hover { border-color: #3ABFC2; }

    /* ── Input fields — rounded ── */
    .stTextInput > div > div > input,
    .stTextArea > div > div > textarea,
    .stNumberInput > div > div > input {
        border-radius: 8px !important;
        transition: border-color 0.2s ease !important;
    }
    .stTextInput > div > div > input:focus,
    .stTextArea > div > div > textarea:focus,
    .stNumberInput > div > div > input:focus {
        border-color: #3ABFC2 !important;
        box-shadow: 0 0 0 2px rgba(58, 191, 194, 0.15) !important;
    }

    /* ── Form container ── */
    [data-testid="stForm"] {
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
    }

    /* ── Page background ── */
    .stApp {
        background-color: #f8f9fb !important;
    }

    /* ── Style Streamlit info/warning/error/success alerts ── */
    [data-testid="stAlert"] {
        border-radius: 8px !important;
        font-size: 0.85rem !important;
    }
    /* Info alert — match teal palette */
    div[data-testid="stAlert"][data-baseweb="notification"][kind="info"],
    .stAlert > div[role="alert"] {
        background-color: #eef8f9 !important;
        border-left-color: #3ABFC2 !important;
        color: #233348 !important;
    }

    /* ── Status widget — rounded ── */
    [data-testid="stStatusWidget"] {
        border-radius: 10px !important;
    }

    /* ── Mobile responsiveness ── */
    @media (max-width: 640px) {
        .brand-bar {
            padding: 0.75rem 1rem !important;
        }
        .brand-bar svg {
            height: 20px !important;
        }
        .brand-tag {
            font-size: 0.55rem !important;
            padding: 0.25rem 0.5rem !important;
            letter-spacing: 0.08em !important;
            white-space: nowrap !important;
        }
        .hero-section {
            padding: 1.25rem 1rem 1rem !important;
        }
        .hero-title {
            font-size: 1.4rem !important;
        }
        .hero-subtitle {
            font-size: 0.82rem !important;
        }
        .process-cards {
            grid-template-columns: 1fr !important;
        }
        .rec-docs {
            grid-template-columns: 1fr !important;
        }
        .result-grid {
            grid-template-columns: 1fr !important;
        }
        .step-bar {
            border-radius: 8px !important;
        }
        .step-item {
            font-size: 0 !important;
            padding: 0.7rem 0.15rem !important;
            display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
        }
        .step-num {
            width: 1.6rem !important; height: 1.6rem !important;
            font-size: 0.7rem !important;
            margin-right: 0 !important;
        }
        .step-label {
            font-size: 0.6rem !important;
            display: block;
        }
    }

    footer { visibility: hidden; }
    #MainMenu { visibility: hidden; }
    header[data-testid="stHeader"] { background: transparent; }
</style>
""", unsafe_allow_html=True)


# ── Session state defaults ───────────────────────────────────────────────────

_defaults = {
    "step": 1,
    "uploaded_files_data": [],   # list of (name, bytes)
    "datos_llm": None,
    "kyc_path": None,
}
for _k, _v in _defaults.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v


# ── Helper: safe get from nested dict ────────────────────────────────────────

def _g(d: dict | None, *keys, default=""):
    """Safely traverse nested dict keys, returning default if any is missing."""
    val = d
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        else:
            return default
    if val is None:
        return default
    return val


# ── Header ───────────────────────────────────────────────────────────────────

st.markdown("""
<div class="brand-bar">
    <svg viewBox="0 0 1013.7 84.4" xmlns="http://www.w3.org/2000/svg">
        <style>.lh{fill:#3ABFC2}.lp{fill:#FFFFFF}</style>
        <polygon class="lh" points="782.6,60.6 782.6,41.6 753.2,41.6 753.2,60.6 750.8,60.6 750.8,22 753.2,22 753.2,39.4 782.6,39.4 782.6,22 785,22 785,60.6"/>
        <g><path class="lh" d="M843.7,41.3c0-3.7-0.7-6.9-2.2-9.6c-1.4-2.7-3.5-4.8-6.3-6.3c-2.7-1.5-6-2.2-9.8-2.2c-3.7,0-6.9,0.7-9.6,2.1c-2.7,1.4-4.8,3.5-6.3,6.2c-1.5,2.7-2.2,6-2.2,9.8c0,3.7,0.7,6.9,2.1,9.6c1.4,2.7,3.5,4.8,6.2,6.3c2.7,1.5,6,2.2,9.8,2.2c3.7,0,6.9-0.7,9.6-2.1c2.7-1.4,4.9-3.5,6.3-6.2C842.9,48.3,843.7,45,843.7,41.3 M846.2,41.3c0,4-0.8,7.5-2.5,10.6c-1.6,3-4,5.4-7.1,7.1c-3.1,1.7-6.8,2.6-11.1,2.6c-3,0-5.8-0.5-8.3-1.4c-2.5-0.9-4.7-2.2-6.6-3.9c-1.9-1.7-3.3-3.9-4.3-6.4c-1-2.5-1.5-5.4-1.5-8.6c0-4,0.8-7.6,2.5-10.6c1.7-3,4-5.4,7.2-7.1c3.1-1.7,6.8-2.5,11.1-2.5c4.1,0,7.7,0.8,10.8,2.4c3.1,1.6,5.5,3.9,7.2,7C845.3,33.5,846.2,37.1,846.2,41.3"/><polygon class="lh" points="906.6,60.6 906.6,25.4 888.5,60.6 886.4,60.6 868.3,25.5 868.3,60.6 866,60.6 866,22 869,22 887.5,58 906.1,22 908.9,22 908.9,60.6"/><polygon class="lh" points="930.8,60.6 930.8,22 960.1,22 960.1,24.1 933.1,24.1 933.1,39.5 958.8,39.5 958.8,41.6 933.1,41.6 933.1,58.4 960.8,58.4 960.2,60.6"/><path class="lh" d="M1008.1,30.9c-1-2.8-2.6-4.8-4.8-6c-2.1-1.2-5.2-1.8-9.1-1.8c-4.4,0-7.8,0.7-10.1,2.1c-2.3,1.4-3.5,3.4-3.5,6.1c0,2.3,0.9,4,2.6,5.2c1.7,1.2,4.5,2.1,8.5,2.6l6.5,0.9c4.5,0.6,7.8,1.8,9.9,3.5c2.1,1.7,3.1,4.1,3.1,7.2c0,3.5-1.4,6.2-4.1,8.1c-2.7,1.9-6.7,2.8-12,2.8c-10.7,0-16.7-3.6-17.8-10.7h2.4c0.6,2.9,2.2,5.1,4.8,6.5c2.5,1.4,6.1,2.1,10.6,2.1c4.5,0,8-0.7,10.2-2.2c2.3-1.5,3.4-3.7,3.4-6.5c0-2.5-0.9-4.4-2.7-5.7c-1.8-1.3-4.7-2.3-8.8-2.8l-5.8-0.8c-3.1-0.4-5.6-1-7.5-1.9c-1.9-0.8-3.3-1.9-4.2-3.2c-0.9-1.3-1.3-2.9-1.3-4.8c0-3.3,1.4-5.9,4.2-7.7c2.8-1.8,6.7-2.8,11.8-2.8c4.5,0,8.1,0.7,10.6,2.2c2.5,1.5,4.4,3.9,5.5,7.2L1008.1,30.9z"/><path class="lp" d="M33.9,4.9h-1.2V4.7H2.5V32h7.7V11h22.5c10.2,0,17.4,6.6,17.4,16c0,9.4-7.1,16-17.4,16H2.5v37h7.7V49.3h23.7c14.3,0,24.2-9.1,24.2-22.2C58.1,16.1,50.7,4.9,33.9,4.9"/><path class="lp" d="M141,80h9l-21.8-31.7l2-0.2c10-0.9,20.1-7.8,20.1-21.4c0-13.2-9.8-22-24.4-22H94.6v27.4h7.7V11h22.5c10.3,0,17.5,6.6,17.5,16c0,9.5-7.2,16.1-17.5,16.1H94.6V80h7.7V49.3h18.1L141,80z"/><path class="lp" d="M226.5,74.9c-18.2,0-31-13.4-31-32.7c0-19.2,12.7-32.7,31-32.7c18.3,0,31.1,13.4,31.1,32.7C257.6,61.4,244.8,74.9,226.5,74.9 M226.5,3.4c-23,0-39.1,16-39.1,38.8c0,22.9,16.1,38.8,39.1,38.8c22.7,0,39.2-16.3,39.2-38.8C265.7,19.7,249.2,3.4,226.5,3.4"/><polygon class="lp" points="360.7,4.7 332.6,73.5 304.4,4.7 295.5,4.7 327.2,79.8 338.1,79.8 369.7,4.7"/><polygon class="lp" points="414.7,5.4 383,79.9 392,79.9 399.2,62.8 441.1,62.8 448.3,79.9 457.3,79.9 447.4,56.6 401.2,56.6 420.1,10.9 434.7,45.9 442.8,45.9 425.7,5.4"/><rect x="491.9" y="73.5" class="lp" width="45.4" height="6.3"/><rect x="491.9" y="4.7" class="lp" width="7.7" height="58.1"/><rect x="573.7" y="4.7" class="lp" width="7.7" height="75.1"/><polygon class="lp" points="646.6,26.1 629,4.3 619,4.3 641.7,32.2"/><polygon class="lp" points="680.3,4.3 619,79.8 628.7,79.8 690.1,4.3"/><polygon class="lp" points="662.6,57.8 683.1,80.4 693,80.4 667.5,51.8"/></g>
    </svg>
    <div class="brand-tag">Portal del Inversor</div>
</div>
<div class="hero-section">
    <div class="hero-title">Registro de datos societarios</div>
    <p class="hero-subtitle">
        Suba sus documentos legales y revise la informaci&oacute;n extra&iacute;da
        de forma autom&aacute;tica para completar el proceso de inversi&oacute;n.
    </p>
</div>
""", unsafe_allow_html=True)


# ── Step bar ─────────────────────────────────────────────────────────────────

step = st.session_state.step
labels = ["Documentos", "Procesamiento", "Revisión", "Confirmación"]

def _cls(i):
    if i + 1 < step:
        return "done"
    if i + 1 == step:
        return "active"
    return ""

st.markdown(
    '<div class="step-bar">'
    + "".join(
        f'<div class="step-item {_cls(i)}">'
        f'<span class="step-num">{"&#10003;" if _cls(i) == "done" else i + 1}</span>'
        f'<span class="step-label">{lbl}</span></div>'
        for i, lbl in enumerate(labels)
    )
    + '</div>',
    unsafe_allow_html=True,
)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Upload documents
# ══════════════════════════════════════════════════════════════════════════════

if step == 1:
    # Process overview cards
    st.markdown("""
    <div class="process-cards">
        <div class="process-card">
            <div class="process-card-icon">&#128196;</div>
            <div class="process-card-title">1. Suba documentos</div>
            <div class="process-card-desc">Escrituras, poderes y documentos societarios en PDF</div>
        </div>
        <div class="process-card">
            <div class="process-card-icon">&#9881;</div>
            <div class="process-card-title">2. Extracci&oacute;n autom&aacute;tica</div>
            <div class="process-card-desc">IA analiza y extrae datos clave de cada documento</div>
        </div>
        <div class="process-card">
            <div class="process-card-icon">&#9989;</div>
            <div class="process-card-title">3. Revise y confirme</div>
            <div class="process-card-desc">Verifique la informaci&oacute;n y complete los campos que falten</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="section-title">Documentaci&oacute;n del inversor</div>
    <div class="section-desc">
        Suba los documentos legales de la sociedad inversora en formato PDF.
        Puede subir varios archivos a la vez.
    </div>
    """, unsafe_allow_html=True)

    # Recommended documents as styled cards
    st.markdown("""
    <div class="rec-docs">
        <div class="rec-doc">
            <div class="rec-doc-icon">&#128221;</div>
            <span>Escritura de constituci&oacute;n</span>
        </div>
        <div class="rec-doc">
            <div class="rec-doc-icon">&#128100;</div>
            <span>Nombramiento del &oacute;rgano</span>
        </div>
        <div class="rec-doc">
            <div class="rec-doc-icon">&#128274;</div>
            <span>Poderes del representante</span>
        </div>
        <div class="rec-doc">
            <div class="rec-doc-icon">&#128200;</div>
            <span>Ampliaciones de capital</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    uploaded = st.file_uploader(
        "Arrastra aquí los PDFs",
        type=["pdf"],
        accept_multiple_files=True,
        label_visibility="collapsed",
    )

    if uploaded:
        for f in uploaded:
            st.markdown(
                f'<div class="doc-list-item">&#128196; {f.name}</div>',
                unsafe_allow_html=True,
            )

    st.markdown('<hr class="divider-subtle">', unsafe_allow_html=True)

    if st.button(
        "Procesar documentos",
        type="primary",
        use_container_width=True,
        disabled=not uploaded,
    ):
        st.session_state.uploaded_files_data = [
            (f.name, f.getbuffer().tobytes()) for f in uploaded
        ]
        st.session_state.step = 2
        st.rerun()

    if not uploaded:
        st.info("Suba al menos un documento PDF para continuar.")

    st.markdown("""
    <div class="security-note">
        <div class="security-note-icon">&#128274;</div>
        <div class="security-note-text">
            Sus documentos se procesan de forma segura y no se almacenan en ning&uacute;n servidor externo.
        </div>
    </div>
    """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Processing
# ══════════════════════════════════════════════════════════════════════════════

elif step == 2:
    files_data = st.session_state.uploaded_files_data
    if not files_data:
        st.session_state.step = 1
        st.rerun()

    progress = st.progress(0, text="Iniciando procesamiento…")

    with st.status("Analizando documentos…", expanded=True) as status:
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp = Path(tmp_dir)

                # Save temp files
                progress.progress(10, text="Guardando documentos temporales…")
                st.write("Guardando documentos…")
                pdf_paths = []
                for name, data in files_data:
                    p = tmp / name
                    p.write_bytes(data)
                    pdf_paths.append(p)

                # Extract text
                progress.progress(20, text="Extrayendo texto de los PDFs…")
                st.write("Extrayendo texto de los PDFs…")
                textos = []
                for idx, pp in enumerate(pdf_paths):
                    texto = extraer_texto_pdf(pp)
                    pct = 20 + int(30 * (idx + 1) / len(pdf_paths))
                    progress.progress(pct, text=f"Leyendo {pp.name}…")
                    if texto:
                        textos.append(f"=== DOCUMENTO: {pp.name} ===\n{texto}")
                        st.write(f"  ✓ {pp.name} — {len(texto):,} caracteres")
                    else:
                        st.warning(f"  ✗ {pp.name} — sin texto extraíble")

                if not textos:
                    st.error("No se pudo extraer texto de ningún documento.")
                    status.update(label="Error", state="error")
                    progress.empty()
                    if st.button("Volver a intentar"):
                        st.session_state.step = 1
                        st.rerun()
                    st.stop()

                texto_completo = "\n\n".join(textos)
                if len(texto_completo) > 400_000:
                    texto_completo = texto_completo[:400_000]

                # LLM extraction
                llm_provider = os.getenv("LLM_PROVIDER", "openai")
                provider_label = "Claude" if llm_provider == "anthropic" else "GPT"
                progress.progress(55, text=f"Analizando con {provider_label}…")
                st.write(f"Analizando documentos con {provider_label}…")
                datos_llm = extraer_con_llm(texto_completo, llm_provider)

                progress.progress(95, text="Preparando formulario…")
                st.write("Extracción completada.")

            # Store and advance
            st.session_state.datos_llm = datos_llm
            st.session_state.step = 3
            progress.progress(100, text="Listo")
            status.update(label="Completado", state="complete")
            st.rerun()

        except Exception as e:
            progress.empty()
            status.update(label="Error", state="error")
            st.error(f"Error durante el procesamiento: {e}")
            if st.button("Volver al inicio"):
                st.session_state.step = 1
                st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Review / Edit form
# ══════════════════════════════════════════════════════════════════════════════

elif step == 3:
    datos = st.session_state.datos_llm
    if datos is None:
        st.session_state.step = 1
        st.rerun()

    st.markdown("""
    <div class="section-title">Revisión de datos extraídos</div>
    <div class="section-desc">
        Hemos extraído la siguiente información de sus documentos.
        Revise cada campo, corrija lo que sea necesario y complete los datos que falten.
    </div>
    """, unsafe_allow_html=True)

    # Prepare cargos dataframe for data_editor
    cargos_raw = _g(datos, "organo_administracion", "cargos", default=[]) or []
    if not isinstance(cargos_raw, list):
        cargos_raw = []
    if "cargos_df" not in st.session_state:
        st.session_state.cargos_df = pd.DataFrame(
            cargos_raw if cargos_raw else [{"cargo": "", "nombre": "", "documento_identidad": ""}],
            columns=["cargo", "nombre", "documento_identidad"],
        )

    with st.form("kyc_form"):

        # ── Tab 1: Datos Societarios ─────────────────────────────────────
        tab_soc, tab_con, tab_cap, tab_reg, tab_org, tab_rep = st.tabs([
            "Datos Societarios",
            "Constitución",
            "Capital Social",
            "Datos Registrales",
            "Órgano de Administración",
            "Representante Legal",
        ])

        with tab_soc:
            ds = datos.get("datos_societarios") or {}
            dom = ds.get("domicilio_social") or {}

            c1, c2 = st.columns(2)
            with c1:
                f_denominacion = st.text_input(
                    "Denominación social *",
                    value=_g(ds, "denominacion_actual"),
                    key="f_denominacion",
                )
            with c2:
                f_nif = st.text_input(
                    "NIF / CIF *",
                    value=_g(ds, "nif"),
                    key="f_nif",
                )

            c1, c2 = st.columns(2)
            with c1:
                f_forma = st.text_input(
                    "Forma jurídica",
                    value=_g(ds, "forma_juridica"),
                    key="f_forma",
                )
            with c2:
                f_cnae = st.text_input(
                    "CNAE",
                    value=_g(ds, "cnae"),
                    key="f_cnae",
                )

            st.markdown("**Domicilio social**")
            dc1, dc2 = st.columns([3, 1])
            with dc1:
                f_calle = st.text_input(
                    "Calle y número",
                    value=_g(dom, "calle"),
                    key="f_calle",
                )
            with dc2:
                f_cp = st.text_input(
                    "Código postal",
                    value=_g(dom, "codigo_postal"),
                    key="f_cp",
                )
            dc3, dc4 = st.columns(2)
            with dc3:
                f_localidad = st.text_input(
                    "Localidad",
                    value=_g(dom, "localidad"),
                    key="f_localidad",
                )
            with dc4:
                f_provincia = st.text_input(
                    "Provincia",
                    value=_g(dom, "provincia"),
                    key="f_provincia",
                )

            f_objeto = st.text_area(
                "Objeto social",
                value=_g(ds, "objeto_social"),
                height=100,
                key="f_objeto",
            )

            c1, c2 = st.columns(2)
            with c1:
                f_duracion = st.text_input(
                    "Duración",
                    value=_g(ds, "duracion"),
                    key="f_duracion",
                )
            with c2:
                prev_names = _g(ds, "denominaciones_anteriores", default=[])
                if isinstance(prev_names, list):
                    prev_names = ", ".join(prev_names)
                f_denom_ant = st.text_input(
                    "Denominaciones anteriores",
                    value=prev_names or "",
                    help="Separar con comas si hay varias",
                    key="f_denom_ant",
                )

        # ── Tab 2: Constitución ──────────────────────────────────────────
        with tab_con:
            dc_data = datos.get("datos_constitucion") or {}

            c1, c2 = st.columns(2)
            with c1:
                f_notario = st.text_input(
                    "Notario",
                    value=_g(dc_data, "notario"),
                    key="f_notario",
                )
            with c2:
                f_loc_notario = st.text_input(
                    "Localidad del notario",
                    value=_g(dc_data, "localidad_notario"),
                    key="f_loc_notario",
                )

            c1, c2 = st.columns(2)
            with c1:
                f_fecha_const = st.text_input(
                    "Fecha de constitución",
                    value=_g(dc_data, "fecha"),
                    help="Formato: DD de MES de AAAA",
                    key="f_fecha_const",
                )
            with c2:
                f_num_protocolo = st.text_input(
                    "Número de protocolo",
                    value=_g(dc_data, "numero_protocolo"),
                    key="f_num_protocolo",
                )

        # ── Tab 3: Capital Social ────────────────────────────────────────
        with tab_cap:
            cs = datos.get("capital_social") or {}

            c1, c2 = st.columns(2)
            with c1:
                f_cap_importe = st.number_input(
                    "Importe del capital social",
                    value=float(_g(cs, "importe", default=0) or 0),
                    min_value=0.0,
                    format="%.2f",
                    key="f_cap_importe",
                )
            with c2:
                f_cap_moneda = st.text_input(
                    "Moneda",
                    value=_g(cs, "moneda", default="EUR"),
                    key="f_cap_moneda",
                )

            c1, c2 = st.columns(2)
            with c1:
                f_num_part = st.number_input(
                    "Número de participaciones",
                    value=int(_g(cs, "num_participaciones", default=0) or 0),
                    min_value=0,
                    key="f_num_part",
                )
            with c2:
                f_val_nominal = st.number_input(
                    "Valor nominal unitario",
                    value=float(_g(cs, "valor_nominal_unitario", default=0) or 0),
                    min_value=0.0,
                    format="%.2f",
                    key="f_val_nominal",
                )

        # ── Tab 4: Datos Registrales ─────────────────────────────────────
        with tab_reg:
            dr = datos.get("datos_registrales") or {}

            c1, c2 = st.columns(2)
            with c1:
                f_reg_merc = st.text_input(
                    "Registro Mercantil",
                    value=_g(dr, "registro_mercantil"),
                    key="f_reg_merc",
                )
            with c2:
                f_tomo = st.text_input(
                    "Tomo",
                    value=_g(dr, "tomo"),
                    key="f_tomo",
                )

            c1, c2, c3 = st.columns(3)
            with c1:
                f_folio = st.text_input(
                    "Folio",
                    value=_g(dr, "folio"),
                    key="f_folio",
                )
            with c2:
                f_hoja = st.text_input(
                    "Hoja",
                    value=_g(dr, "hoja"),
                    key="f_hoja",
                )
            with c3:
                f_inscripcion = st.text_input(
                    "Inscripción",
                    value=_g(dr, "inscripcion"),
                    key="f_inscripcion",
                )

        # ── Tab 5: Órgano de Administración ──────────────────────────────
        with tab_org:
            oa = datos.get("organo_administracion") or {}

            f_tipo_organo = st.text_input(
                "Tipo de órgano",
                value=_g(oa, "tipo"),
                help="Ej: Administrador Único, Consejo de Administración…",
                key="f_tipo_organo",
            )

            st.markdown("**Cargos**")
            st.caption("Puede añadir o eliminar filas con los botones de la tabla.")

            f_cargos_df = st.data_editor(
                st.session_state.cargos_df,
                column_config={
                    "cargo": st.column_config.TextColumn("Cargo", width="medium"),
                    "nombre": st.column_config.TextColumn("Nombre completo", width="large"),
                    "documento_identidad": st.column_config.TextColumn("DNI/NIE/Pasaporte", width="medium"),
                },
                num_rows="dynamic",
                use_container_width=True,
                key="f_cargos_editor",
            )

        # ── Tab 6: Representante Legal ───────────────────────────────────
        with tab_rep:
            rl = datos.get("representante_legal_firmante") or {}

            c1, c2 = st.columns(2)
            with c1:
                f_rep_nombre = st.text_input(
                    "Nombre completo *",
                    value=_g(rl, "nombre_completo"),
                    key="f_rep_nombre",
                )
            with c2:
                f_rep_dni = st.text_input(
                    "DNI / NIE *",
                    value=_g(rl, "dni"),
                    key="f_rep_dni",
                )

            c1, c2 = st.columns(2)
            with c1:
                f_rep_cargo = st.text_input(
                    "Cargo en la sociedad",
                    value=_g(rl, "cargo_en_sociedad"),
                    key="f_rep_cargo",
                )
            with c2:
                f_rep_dom = st.text_input(
                    "Domicilio",
                    value=_g(rl, "domicilio"),
                    key="f_rep_dom",
                )

        # ── Submit ───────────────────────────────────────────────────────
        st.markdown('<hr class="divider-subtle">', unsafe_allow_html=True)
        st.markdown(
            '<p style="font-size:0.82rem; color:#94a3b8;">'
            'Los campos marcados con * son obligatorios.</p>',
            unsafe_allow_html=True,
        )

        submitted = st.form_submit_button(
            "Confirmar y enviar datos",
            type="primary",
            use_container_width=True,
        )

    if submitted:
        # Build KYC dict from form values
        denom_ant_str = st.session_state.get("f_denom_ant", "")
        denom_ant_list = [
            s.strip() for s in denom_ant_str.split(",") if s.strip()
        ] if denom_ant_str else []

        # Get cargos from data_editor return value (not session state key,
        # which in Streamlit ≥1.23 holds the edit-state dict, not the DataFrame)
        cargos_list = f_cargos_df.dropna(how="all").to_dict("records")

        kyc_data = {
            "datos_societarios": {
                "denominacion_actual": st.session_state.get("f_denominacion", ""),
                "denominaciones_anteriores": denom_ant_list,
                "nif": st.session_state.get("f_nif", ""),
                "forma_juridica": st.session_state.get("f_forma", ""),
                "domicilio_social": {
                    "calle": st.session_state.get("f_calle", ""),
                    "codigo_postal": st.session_state.get("f_cp", ""),
                    "localidad": st.session_state.get("f_localidad", ""),
                    "provincia": st.session_state.get("f_provincia", ""),
                },
                "objeto_social": st.session_state.get("f_objeto", ""),
                "cnae": st.session_state.get("f_cnae", ""),
                "duracion": st.session_state.get("f_duracion", ""),
            },
            "datos_constitucion": {
                "notario": st.session_state.get("f_notario", ""),
                "localidad_notario": st.session_state.get("f_loc_notario", ""),
                "fecha": st.session_state.get("f_fecha_const", ""),
                "numero_protocolo": st.session_state.get("f_num_protocolo", ""),
            },
            "capital_social": {
                "importe": st.session_state.get("f_cap_importe", 0),
                "moneda": st.session_state.get("f_cap_moneda", "EUR"),
                "num_participaciones": st.session_state.get("f_num_part", 0),
                "valor_nominal_unitario": st.session_state.get("f_val_nominal", 0),
            },
            "datos_registrales": {
                "registro_mercantil": st.session_state.get("f_reg_merc", ""),
                "tomo": st.session_state.get("f_tomo", ""),
                "folio": st.session_state.get("f_folio", ""),
                "hoja": st.session_state.get("f_hoja", ""),
                "inscripcion": st.session_state.get("f_inscripcion", ""),
            },
            "organo_administracion": {
                "tipo": st.session_state.get("f_tipo_organo", ""),
                "cargos": cargos_list,
            },
            "representante_legal_firmante": {
                "nombre_completo": st.session_state.get("f_rep_nombre", ""),
                "dni": st.session_state.get("f_rep_dni", ""),
                "cargo_en_sociedad": st.session_state.get("f_rep_cargo", ""),
                "domicilio": st.session_state.get("f_rep_dom", ""),
            },
        }

        # Validate
        missing = validar_kyc(kyc_data)
        if missing:
            st.error(
                "Faltan campos obligatorios: **"
                + "**, **".join(missing)
                + "**. Complete estos campos antes de confirmar."
            )
        else:
            nombre = kyc_data["datos_societarios"]["denominacion_actual"]
            path = guardar_kyc(kyc_data, nombre)
            st.session_state.kyc_path = str(path)
            st.session_state.kyc_data_final = kyc_data
            st.session_state.step = 4
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Confirmation
# ══════════════════════════════════════════════════════════════════════════════

elif step == 4:
    kyc_data = st.session_state.get("kyc_data_final")
    kyc_path = st.session_state.get("kyc_path")

    if not kyc_data:
        st.session_state.step = 1
        st.rerun()

    ds = kyc_data.get("datos_societarios", {})
    rl = kyc_data.get("representante_legal_firmante", {})

    # Centered success section
    st.markdown("""
    <div class="success-section">
        <div class="success-icon-big">&#10003;</div>
        <div class="success-heading">Registro completado</div>
        <div class="success-subtext">
            Sus datos han sido registrados correctamente.
            Gracias por completar el proceso de registro.
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Summary cards
    st.markdown(f"""
    <div class="result-grid">
        <div class="result-card highlight" style="grid-column: 1 / -1;">
            <div class="result-label">Sociedad registrada</div>
            <div class="result-value" style="font-size:1.2rem;">{ds.get('denominacion_actual', '—')}</div>
        </div>
        <div class="result-card">
            <div class="result-label">NIF</div>
            <div class="result-value">{ds.get('nif', '—')}</div>
        </div>
        <div class="result-card">
            <div class="result-label">Representante legal</div>
            <div class="result-value">{rl.get('nombre_completo', '—')}</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Download
    json_str = json.dumps(kyc_data, ensure_ascii=False, indent=2)
    st.download_button(
        "Descargar copia de los datos (JSON)",
        data=json_str,
        file_name=f"KYC_{ds.get('denominacion_actual', 'inversor').replace(' ', '_').upper()}.json",
        mime="application/json",
        use_container_width=True,
    )

    if kyc_path:
        st.markdown(
            f'<p class="footer-note">Datos guardados en: <code>{kyc_path}</code></p>',
            unsafe_allow_html=True,
        )

    st.markdown("")
    if st.button("Registrar otro inversor", use_container_width=True):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()
