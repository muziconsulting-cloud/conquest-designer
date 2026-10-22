#!/usr/bin/env python3
"""Open Agent Hackathon 2026 - compliance monitor.

Reads requirements.json (single source of truth) and checks a target repo
against the hard gates, deliverables and rubric. Informational by design:
prints drift/failures and exits 0 unless --strict is passed.

Usage:
    python3 compliance_check.py [--repo PATH] [--json] [--strict] [--now ISO8601]

Never network-fetches. The agent re-verifies the live rules separately and
updates requirements.json (with source + fetched date) before running this.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
REQUIREMENTS = SKILL_DIR / "requirements.json"

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".next", "vendor", "hackathon-compliance"}
TEXT_EXT = {
    ".md", ".txt", ".json", ".jsonc", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java",
    ".sh", ".env", ".example", ".html", ".css", ".sql", ".csv",
}
MAX_READ_BYTES = 400_000
CODE_EXT = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java",
    ".rb", ".php", ".cs", ".swift", ".kt", ".sh", ".sql", ".vue", ".svelte", ".astro",
}

SECRET_NAME_RE = re.compile(r"(^|/)(\.env(\.local)?|.*\.pem|.*\.key|id_rsa|.*credentials.*\.json)$", re.I)
SECRET_CONTENT_RES = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bghp_[A-Za-z0-9]{36}\b"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),
]

PASS, FAIL, WARN, INFO = "PASS", "FAIL", "WARN", "INFO"


class Report:
    def __init__(self) -> None:
        self.rows: list[tuple[str, str, str]] = []
        self.hard_fail = False

    def add(self, status: str, check: str, detail: str = "", hard: bool = False) -> None:
        self.rows.append((status, check, detail))
        if status == FAIL and hard:
            self.hard_fail = True

    def print(self) -> None:
        icon = {PASS: "[PASS]", FAIL: "[FAIL]", WARN: "[WARN]", INFO: "[INFO]"}
        for status, check, detail in self.rows:
            line = f"{icon[status]:<7} {check}"
            if detail:
                line += f"  -  {detail}"
            print(line)


def iter_files(repo: Path):
    for p in repo.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        yield p


def git_tracked(repo: Path) -> set[str] | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(repo), "ls-files"],
            capture_output=True, text=True, timeout=20, check=True,
        )
        return set(out.stdout.split())
    except Exception:
        return None


def read_text(p: Path) -> str:
    try:
        if p.stat().st_size > MAX_READ_BYTES:
            return ""
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def check_secrets(repo: Path, tracked: set[str] | None, rep: Report) -> None:
    gi = repo / ".gitignore"
    gi_text = read_text(gi)
    if ".env" in gi_text:
        rep.add(PASS, "secrets: .env gitignored")
    else:
        rep.add(FAIL, "secrets: .env gitignored", ".gitignore missing '.env'", hard=True)

    if tracked is not None:
        leaked = [f for f in tracked if SECRET_NAME_RE.search(f)]
        if leaked:
            rep.add(FAIL, "secrets: no secret files tracked", ", ".join(sorted(leaked)[:5]), hard=True)
        else:
            rep.add(PASS, "secrets: no secret files tracked")

    hits: list[str] = []
    for p in iter_files(repo):
        if p.name == ".env" or p.name.endswith(".env.local"):
            if tracked is None or str(p.relative_to(repo)) in tracked:
                hits.append(f"{p.relative_to(repo)} (raw .env present)")
        if p.suffix.lower() not in TEXT_EXT:
            continue
        txt = read_text(p)
        for rx in SECRET_CONTENT_RES:
            if rx.search(txt):
                hits.append(f"{p.relative_to(repo)}: {rx.pattern}")
                break
    if hits:
        rep.add(WARN, "secrets: content scan", "; ".join(hits[:5]))
    else:
        rep.add(PASS, "secrets: content scan clean")


def _search_repo(repo: Path, patterns: list[str], tracked: set[str] | None,
                 extensions: set[str] | None = None) -> list[str]:
    found: set[str] = set()
    low = [p.lower() for p in patterns]
    for p in iter_files(repo):
        rel = str(p.relative_to(repo))
        if tracked is not None and rel not in tracked:
            continue
        if extensions is not None and p.suffix.lower() not in extensions:
            continue
        hay = rel.lower()
        if p.suffix.lower() in TEXT_EXT and p.stat().st_size <= MAX_READ_BYTES:
            hay += "\n" + read_text(p).lower()
        for pat in low:
            if pat in hay:
                found.add(pat)
    return sorted(found)


def check_hard_gates(req: dict, repo: Path, tracked: set[str] | None, rep: Report, now: datetime) -> None:
    for gate in req.get("hard_gates", []):
        gid, gtype = gate["id"], gate["type"]
        if gtype == "manual":
            rep.add(WARN, f"gate: {gid}", "manual / attestation required")
        elif gtype == "repo_evidence":
            must = gate.get("must_be_real", False)
            hits = _search_repo(repo, gate.get("patterns", []), tracked,
                                CODE_EXT if must else None)
            if hits:
                rep.add(PASS, f"gate: {gid}", f"found: {', '.join(hits)}")
            else:
                detail = gate.get("desc", "")
                if must:
                    doc_hits = _search_repo(repo, gate.get("patterns", []), tracked)
                    if doc_hits:
                        detail = "only in docs, not code: " + ", ".join(doc_hits)
                rep.add(FAIL, f"gate: {gid}", detail, hard=must)
        elif gtype == "date":
            sched = req.get("schedule", {})
            start = _parse(sched.get("build_start_utc"))
            end = _parse(sched.get("submission_deadline_utc"))
            if start and end:
                if now < start:
                    rep.add(INFO, f"gate: {gid}", f"pre-window ({_until(now, start)})")
                elif now > end:
                    rep.add(FAIL, f"gate: {gid}", "build window closed", hard=True)
                else:
                    rep.add(PASS, f"gate: {gid}", f"in-window ({_until(now, end)} left)")
            else:
                rep.add(WARN, f"gate: {gid}", "no schedule in requirements.json")


def check_deliverables(req: dict, repo: Path, rep: Report) -> None:
    for d in req.get("deliverables", []):
        dtype = d["type"]
        if dtype == "artifact":
            found = []
            for g in d.get("globs", []):
                found += [str(p.relative_to(repo)) for p in repo.glob(g) if p.is_file()
                          and not any(part in SKIP_DIRS for part in p.parts)]
            if found:
                rep.add(PASS, f"deliverable: {d['id']}", ", ".join(sorted(set(found))[:3]))
            else:
                rep.add(FAIL, f"deliverable: {d['id']}", d.get("desc", ""), hard=False)
        elif dtype == "repo_evidence":
            readme = _read_readme(repo)
            probs = []
            for h in d.get("require_headings", []):
                if not re.search(rf"^#+\s*.*{re.escape(h)}", readme, re.I | re.M):
                    probs.append(f"missing heading ~'{h}'")
            found = _search_repo(repo, d.get("patterns", []), None) if d.get("patterns") else []
            for pat in d.get("patterns", []):
                if pat.lower() not in [f.lower() for f in found]:
                    probs.append(f"missing '{pat}'")
            if probs:
                rep.add(FAIL, f"deliverable: {d['id']}", "; ".join(probs[:4]))
            else:
                rep.add(PASS, f"deliverable: {d['id']}")
        elif dtype == "repo":
            rep.add(INFO, f"deliverable: {d['id']}", d.get("desc", ""))


def _read_readme(repo: Path) -> str:
    for name in ("README.md", "README.MD", "readme.md", "README"):
        p = repo / name
        if p.is_file():
            return read_text(p)
    return ""


def _parse(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso)
    except ValueError:
        return None


def _until(a: datetime, b: datetime) -> str:
    secs = int((b - a).total_seconds())
    d, rem = divmod(abs(secs), 86400)
    h, rem = divmod(rem, 3600)
    m = rem // 60
    return f"{d}d {h}h {m}m"


def print_rubric(req: dict) -> None:
    print("\nRubric self-score (fill honestly, sort by points-per-gap):")
    total = 0
    for r in req.get("rubric", []):
        total += int(r["max"])
        print(f"  [    ] {r['criterion']:<38} / {r['max']}")
    print(f"  {'TOTAL':<44}/ {total}")
    print("  (Ties: Impact, then submission timestamp.)")


def main() -> int:
    ap = argparse.ArgumentParser(description="Hackathon compliance monitor")
    ap.add_argument("--repo", default=".", help="repo to check (default: cwd)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--strict", action="store_true", help="exit 1 if a hard gate fails")
    ap.add_argument("--now", help="override current time (ISO8601 UTC)")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    if not REQUIREMENTS.is_file():
        print(f"requirements.json not found at {REQUIREMENTS}", file=sys.stderr)
        return 2
    req = json.loads(REQUIREMENTS.read_text())
    now = _parse(args.now) or datetime.now(timezone.utc)
    tracked = git_tracked(repo)

    rep = Report()
    check_hard_gates(req, repo, tracked, rep, now)
    check_deliverables(req, repo, rep)
    check_secrets(repo, tracked, rep)

    if args.json:
        print(json.dumps(
            {"rows": rep.rows, "hard_fail": rep.hard_fail, "now": now.isoformat()}, indent=2
        ))
    else:
        print(f"Open Agent Hackathon 2026 - compliance monitor")
        print(f"repo: {repo}")
        print(f"track: {req.get('track', {}).get('chosen', '?')}")
        print(f"now: {now.isoformat()}  ({'IN' if _in_window(req, now) else 'OUT OF'} window)\n")
        rep.print()
        print_rubric(req)

    if args.strict and rep.hard_fail:
        return 1
    return 0


def _in_window(req: dict, now: datetime) -> bool:
    s = _parse(req.get("schedule", {}).get("build_start_utc"))
    e = _parse(req.get("schedule", {}).get("submission_deadline_utc"))
    return bool(s and e and s <= now <= e)


if __name__ == "__main__":
    raise SystemExit(main())
