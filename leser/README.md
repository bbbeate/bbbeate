# leser

pdf text extraction pipeline. extracts text, tables, and figures with page/position references for ai reading.

## setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## usage

```bash
# extract from url
python extract.py https://example.com/book.pdf my-book

# extract from local file
python extract.py data/pdfs/mybook.pdf

# review tables and figures
python review.py my-book

# list all parsed files
python review.py --list

# show stats
python review.py --stats
```

## data flow

pdf -> `extract.py` -> `data/parsed/*.json` -> `review.py` -> `data/reviewed/*.json`

each chunk stores: page number, bbox coordinates, type (text/table/figure), review status.

## chunk format

```json
{
  "page": 42,
  "type": "text",
  "content": "the sun in aries...",
  "bbox": [x0, y0, x1, y1],
  "source": "book.pdf",
  "status": "auto"
}
```

status: `auto` (text, no review needed), `needs_review` (tables/figures), `approved`, `edited`, `discarded`
