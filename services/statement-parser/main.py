import csv
import io
import os
import re
from datetime import datetime

import msoffcrypto
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader

app = FastAPI(title="Personal OS statement parser")


@app.get("/health")
def health():
    return {"status": "ok"}


class ParseRequest(BaseModel):
    filename: str
    base64: str
    password: str | None = None


@app.post("/parse")
def parse_statement(payload: ParseRequest, x_parser_token: str | None = Header(default=None)):
    expected = os.environ.get("STATEMENT_PARSER_TOKEN")
    if expected and x_parser_token != expected:
        raise HTTPException(status_code=401, detail="Invalid parser token")
    try:
        import base64
        raw = base64.b64decode(payload.base64)
        if payload.filename.lower().endswith(".pdf"):
            text = read_pdf(raw, payload.password)
            rows = rows_from_text(text)
        elif payload.filename.lower().endswith((".xlsx", ".xls")):
            rows = rows_from_csv(read_excel(raw, payload.password))
        else:
            rows = rows_from_csv(raw.decode("utf-8-sig"))
        return {"transactions": rows[:500]}
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Could not parse statement: {error}") from error


def read_pdf(raw: bytes, password: str | None) -> str:
    reader = PdfReader(io.BytesIO(raw))
    if reader.is_encrypted:
        if not password or reader.decrypt(password) == 0:
            raise ValueError("A valid PDF password is required")
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def read_excel(raw: bytes, password: str | None) -> str:
    source = io.BytesIO(raw)
    if password:
        decrypted = io.BytesIO()
        office = msoffcrypto.OfficeFile(source)
        office.load_key(password=password)
        office.decrypt(decrypted)
        source = decrypted
    from openpyxl import load_workbook
    workbook = load_workbook(source, read_only=True, data_only=True)
    sheet = workbook.active
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(sheet.iter_rows(values_only=True))
    return output.getvalue()


def rows_from_csv(value: str) -> list[dict]:
    rows = list(csv.reader(io.StringIO(value)))
    if rows and not looks_like_date(rows[0][0] if rows[0] else ""):
        rows = rows[1:]
    result = []
    for row in rows:
        if len(row) < 2:
            continue
        date = normalize_date(row[0])
        amount = parse_amount(row[1])
        if date and amount:
            result.append(transaction(date, amount, ", ".join(row[2:]).strip()))
    return result


def rows_from_text(value: str) -> list[dict]:
    result = []
    pattern = re.compile(r"(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?P<merchant>.+?)\s+(?P<amount>[+-]?[₹$€£]?\s?[\d,]+(?:\.\d{2})?)$")
    for line in value.splitlines():
        match = pattern.search(" ".join(line.split()))
        if match:
            date = normalize_date(match.group("date")); amount = parse_amount(match.group("amount"))
            if date and amount:
                result.append(transaction(date, amount, match.group("merchant")))
    return result


def transaction(date: str, amount: float, merchant: str | None) -> dict:
    return {"amount": abs(amount), "transaction_type": "expense" if amount < 0 else "income", "merchant": merchant or None, "transaction_date": date}


def parse_amount(value: str) -> float:
    negative = "-" in value or value.strip().lower().endswith("dr")
    number = float(re.sub(r"[^0-9.]", "", value) or 0)
    return -number if negative else number


def looks_like_date(value: str) -> bool:
    return bool(re.match(r"^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$", value.strip()))


def normalize_date(value: str) -> str | None:
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(value.strip(), pattern).date().isoformat()
        except ValueError:
            continue
    return None
