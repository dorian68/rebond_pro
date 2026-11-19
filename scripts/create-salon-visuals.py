"""Compatibility entry point for the current Le Bon Rebond infographic."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("create-salon-infographic.py")), run_name="__main__")
