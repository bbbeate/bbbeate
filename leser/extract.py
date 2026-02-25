import pdfplumber
import json
import os
import sys
import requests
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PDF_DIR = DATA_DIR / "pdfs"
PARSED_DIR = DATA_DIR / "parsed"


def download_pdf(url, name=None):
    name = name or url.split("/")[-1]
    if not name.endswith(".pdf"):
        name += ".pdf"
    dest = PDF_DIR / name
    if dest.exists():
        print(f"already downloaded: {dest}")
        return dest
    print(f"downloading {url} -> {dest}")
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)
    print(f"saved {dest} ({dest.stat().st_size / 1024:.0f} kb)")
    return dest


def extract_pdf(pdf_path):
    pdf_path = Path(pdf_path)
    chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            # extract text with position info
            words = page.extract_words(extra_attrs=["top", "bottom"])
            if words:
                # group words into lines by top position
                lines = {}
                for w in words:
                    key = round(w["top"], 1)
                    lines.setdefault(key, []).append(w)

                text = "\n".join(
                    " ".join(w["text"] for w in sorted(line, key=lambda w: w["x0"]))
                    for _, line in sorted(lines.items())
                )
                bbox = [
                    min(w["x0"] for w in words),
                    min(w["top"] for w in words),
                    max(w["x1"] for w in words),
                    max(w["bottom"] for w in words),
                ]
                chunks.append({
                    "page": page_num,
                    "type": "text",
                    "content": text,
                    "bbox": bbox,
                    "source": pdf_path.name,
                    "status": "auto",
                })

            # extract tables
            tables = page.extract_tables()
            for i, table in enumerate(tables):
                if not table:
                    continue
                chunks.append({
                    "page": page_num,
                    "type": "table",
                    "content": table,  # list of rows
                    "table_index": i,
                    "source": pdf_path.name,
                    "status": "needs_review",
                })

            # extract images
            images = page.images
            for i, img in enumerate(images):
                chunks.append({
                    "page": page_num,
                    "type": "figure",
                    "content": f"[figure on page {page_num}, image {i+1}]",
                    "bbox": [img["x0"], img["top"], img["x1"], img["bottom"]],
                    "source": pdf_path.name,
                    "status": "needs_review",
                })

    return chunks


def save_parsed(chunks, name):
    out = PARSED_DIR / f"{name}.json"
    with open(out, "w") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    stats = {
        "text": sum(1 for c in chunks if c["type"] == "text"),
        "table": sum(1 for c in chunks if c["type"] == "table"),
        "figure": sum(1 for c in chunks if c["type"] == "figure"),
        "needs_review": sum(1 for c in chunks if c["status"] == "needs_review"),
    }
    print(f"saved {out}: {stats}")
    return out


def process(source, name=None):
    if source.startswith("http"):
        pdf_path = download_pdf(source, name)
    else:
        pdf_path = Path(source)
    stem = name or pdf_path.stem
    chunks = extract_pdf(pdf_path)
    save_parsed(chunks, stem)
    return chunks


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python extract.py <pdf-url-or-path> [name]")
        print("  downloads (if url) and extracts pdf into data/parsed/")
        sys.exit(1)
    source = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else None
    process(source, name)
