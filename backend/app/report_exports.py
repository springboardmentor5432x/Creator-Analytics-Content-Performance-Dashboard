"""Small dependency-free exporters used by the local reporting workflow."""

from __future__ import annotations

import csv
import io
import textwrap
import zipfile
from datetime import date
from xml.sax.saxutils import escape as xml_escape


CSV_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe(value: object) -> object:
    """Neutralize CSV formula injection when a row is opened in Excel.

    A leading formula trigger is prefixed with a single quote so Excel treats
    the cell as text. Numbers keep their numeric type.
    """
    if isinstance(value, str) and value.startswith(CSV_FORMULA_PREFIXES):
        return f"'{value}"
    return value


def csv_bytes(rows: list[dict[str, object]]) -> bytes:
    """Serialize report rows to a UTF-8 CSV that opens cleanly in Excel."""
    fieldnames = list(rows[0]) if rows else ["message"]
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(
        {field: _csv_safe(record.get(field)) for field in fieldnames}
        if rows else [{"message": "No data in the selected period."}]
        for record in (rows or [])
    )
    return buffer.getvalue().encode("utf-8-sig")


def _xlsx_cell(value: object, column: int, row: int) -> str:
    reference = f"{_xlsx_column(column)}{row}"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{reference}"><v>{value}</v></c>'
    text = xml_escape(str(value if value is not None else ""))
    return f'<c r="{reference}" t="inlineStr"><is><t>{text}</t></is></c>'


def _xlsx_column(index: int) -> str:
    label = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        label = chr(65 + remainder) + label
    return label


def xlsx_bytes(rows: list[dict[str, object]], sheet_name: str = "CreatorIQ report") -> bytes:
    """Create a standards-compliant one-sheet XLSX without an extra dependency."""
    fieldnames = list(rows[0]) if rows else ["message"]
    all_rows = [dict(zip(fieldnames, fieldnames)), *(rows or [{"message": "No data in the selected period."}])]
    sheet_rows = []
    for row_index, record in enumerate(all_rows, start=1):
        cells = "".join(_xlsx_cell(record.get(field, ""), column, row_index) for column, field in enumerate(fieldnames, start=1))
        sheet_rows.append(f'<row r="{row_index}">{cells}</row>')
    title = xml_escape(sheet_name[:31] or "Report")
    worksheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData></worksheet>'
    )
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as workbook:
        workbook.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
        workbook.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        workbook.writestr("xl/workbook.xml", f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="{title}" sheetId="1" r:id="rId1"/></sheets></workbook>')
        workbook.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
        workbook.writestr("xl/worksheets/sheet1.xml", worksheet)
    return archive.getvalue()


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def pdf_bytes(title: str, rows: list[dict[str, object]]) -> bytes:
    """Generate a concise, printable PDF report using the PDF base specification."""
    lines = [title, f"Generated {date.today().isoformat()}", ""]
    if rows:
        headers = list(rows[0])
        lines.append(" | ".join(headers))
        for row in rows:
            raw = " | ".join(str(row.get(header, "")) for header in headers)
            lines.extend(textwrap.wrap(raw, width=95, break_long_words=False) or [""])
    else:
        lines.append("No data in the selected period.")
    safe_lines = [line.encode("latin-1", "replace").decode("latin-1") for line in lines]
    commands = ["BT", "/F1 11 Tf", "50 755 Td", "15 TL"]
    for index, line in enumerate(safe_lines):
        if index:
            commands.append("T*")
        commands.append(f"({_pdf_escape(line)}) Tj")
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")
    start_xref = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    output.extend(b"".join(f"{offset:010d} 00000 n \n".encode("ascii") for offset in offsets[1:]))
    output.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{start_xref}\n%%EOF\n".encode("ascii"))
    return bytes(output)
