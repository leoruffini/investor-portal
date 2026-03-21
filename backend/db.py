import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

# Load .env from project root (parent of /backend)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
