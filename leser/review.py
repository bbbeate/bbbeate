import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PARSED_DIR = DATA_DIR / "parsed"
REVIEWED_DIR = DATA_DIR / "reviewed"


def format_table(table):
    if not table:
        return "(empty table)"
    col_widths = [0] * max(len(row) for row in table)
    for row in table:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell or "")))
    lines = []
    for row in table:
        cells = [str(cell or "").ljust(col_widths[i]) for i, cell in enumerate(row)]
        lines.append(" | ".join(cells))
        if row == table[0]:
            lines.append("-+-".join("-" * w for w in col_widths))
    return "\n".join(lines)


def review_file(path):
    with open(path) as f:
        chunks = json.load(f)

    to_review = [(i, c) for i, c in enumerate(chunks) if c["status"] == "needs_review"]
    if not to_review:
        print("nothing to review")
        return

    print(f"\n{len(to_review)} chunks need review in {path.name}\n")

    for idx, (i, chunk) in enumerate(to_review):
        print(f"--- [{idx+1}/{len(to_review)}] page {chunk['page']} | {chunk['type']} ---")
        if chunk["type"] == "table":
            print(format_table(chunk["content"]))
        else:
            print(chunk["content"])
        print()

        while True:
            action = input("[a]pprove / [e]dit / [d]iscard / [s]kip / [q]uit > ").strip().lower()
            if action == "a":
                chunks[i]["status"] = "approved"
                print("approved")
                break
            elif action == "e":
                print("enter corrected content (end with empty line):")
                lines = []
                while True:
                    line = input()
                    if line == "":
                        break
                    lines.append(line)
                chunks[i]["content"] = "\n".join(lines)
                chunks[i]["status"] = "edited"
                print("saved edit")
                break
            elif action == "d":
                chunks[i]["status"] = "discarded"
                print("discarded")
                break
            elif action == "s":
                print("skipped")
                break
            elif action == "q":
                save_reviewed(chunks, path.stem)
                print("saved progress, quitting")
                return
            else:
                print("unknown action")

    save_reviewed(chunks, path.stem)
    print(f"\ndone. reviewed file saved.")


def save_reviewed(chunks, name):
    out = REVIEWED_DIR / f"{name}.json"
    with open(out, "w") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    stats = {
        "approved": sum(1 for c in chunks if c.get("status") == "approved"),
        "edited": sum(1 for c in chunks if c.get("status") == "edited"),
        "discarded": sum(1 for c in chunks if c.get("status") == "discarded"),
        "needs_review": sum(1 for c in chunks if c.get("status") == "needs_review"),
        "auto": sum(1 for c in chunks if c.get("status") == "auto"),
    }
    print(f"saved {out}: {stats}")


def show_stats(path):
    with open(path) as f:
        chunks = json.load(f)
    pages = set(c["page"] for c in chunks)
    print(f"\n{path.name}")
    print(f"  pages: {min(pages)}-{max(pages)} ({len(pages)} total)")
    for t in ["text", "table", "figure"]:
        count = sum(1 for c in chunks if c["type"] == t)
        if count:
            print(f"  {t}: {count}")
    for s in ["auto", "needs_review", "approved", "edited", "discarded"]:
        count = sum(1 for c in chunks if c.get("status") == s)
        if count:
            print(f"  {s}: {count}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage:")
        print("  python review.py <name>       review chunks needing attention")
        print("  python review.py --stats      show stats for all parsed files")
        print("  python review.py --list       list parsed files")
        sys.exit(1)

    if sys.argv[1] == "--list":
        for f in sorted(PARSED_DIR.glob("*.json")):
            show_stats(f)
    elif sys.argv[1] == "--stats":
        for d in [PARSED_DIR, REVIEWED_DIR]:
            if d.exists():
                for f in sorted(d.glob("*.json")):
                    show_stats(f)
    else:
        name = sys.argv[1]
        # check reviewed first, then parsed
        reviewed = REVIEWED_DIR / f"{name}.json"
        parsed = PARSED_DIR / f"{name}.json"
        path = reviewed if reviewed.exists() else parsed
        if not path.exists():
            print(f"not found: {name}")
            print(f"available: {', '.join(f.stem for f in PARSED_DIR.glob('*.json'))}")
            sys.exit(1)
        review_file(path)
