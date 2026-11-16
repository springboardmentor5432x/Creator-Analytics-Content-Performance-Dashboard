"""Reports & Export module: analytics / audience / revenue / growth / platform reports as PDF, Excel, CSV."""
import csv, io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..database import db, q, q1
from ..security import target_creator
from ..services.analytics import window, eng_rate

router = APIRouter(prefix="/api/reports", tags=["reports"])
KINDS = {"analytics": "Content Analytics Report", "audience": "Audience Report", "revenue": "Revenue Report",
         "growth": "Growth & Trend Report", "platform": "Platform Comparison Report"}


def build(kind, uid, days):
    """Return list of sections: (heading, headers, rows)."""
    start, end, _ = window(days)
    with db() as c:
        if kind == "analytics":
            top = q(c, "SELECT * FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? ORDER BY views DESC LIMIT 25", (uid, start, end))
            tot = q1(c, "SELECT COUNT(*) p, COALESCE(SUM(views),0) v, COALESCE(SUM(likes),0) l, COALESCE(SUM(comments),0) c, COALESCE(SUM(shares),0) s, COALESCE(SUM(saves),0) sv, COALESCE(SUM(reach),0) r FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ?", (uid, start, end))
            return [("Summary", ["Posts", "Views", "Likes", "Comments", "Shares", "Saves", "Reach"],
                     [[tot["p"], tot["v"], tot["l"], tot["c"], tot["s"], tot["sv"], tot["r"]]]),
                    ("Top-performing content", ["Title", "Platform", "Type", "Published", "Views", "Likes", "Comments", "Shares", "ER %"],
                     [[t["title"], t["platform"], t["type"], t["published_at"][:10], t["views"], t["likes"], t["comments"], t["shares"], eng_rate(t)] for t in top])]
        if kind == "audience":
            g = q(c, "SELECT platform, MIN(followers) start_f, MAX(followers) end_f, SUM(impressions) imp, SUM(reach) reach FROM audience_daily WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY platform", (uid, start, end))
            demo = q(c, "SELECT category, label, value FROM audience_demo WHERE user_id=? AND category<>'hour' ORDER BY id", (uid,))
            return [("Follower growth by platform", ["Platform", "Start", "End", "Impressions", "Reach"], [[x["platform"], x["start_f"], x["end_f"], x["imp"], x["reach"]] for x in g]),
                    ("Demographics (%)", ["Category", "Segment", "Share %"], [[d["category"], d["label"], d["value"]] for d in demo])]
        if kind == "revenue":
            s = q(c, "SELECT source, ROUND(SUM(amount),2) a, COUNT(*) n FROM revenue WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY source ORDER BY a DESC", (uid, start, end))
            d = q(c, "SELECT date, source, platform, brand, amount, status FROM revenue WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY date DESC LIMIT 100", (uid, start, end))
            return [("Revenue by source", ["Source", "Amount ($)", "Payments"], [[x["source"], x["a"], x["n"]] for x in s]),
                    ("Transactions", ["Date", "Source", "Platform", "Brand", "Amount ($)", "Status"], [[x["date"], x["source"], x["platform"], x["brand"], x["amount"], x["status"]] for x in d])]
        if kind == "growth":
            h = q(c, "SELECT type, COUNT(*) n, ROUND(AVG(views)) v FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY type ORDER BY v DESC", (uid, start, end))
            w = q(c, "SELECT strftime('%Y-W%W', published_at) wk, SUM(views) v, COUNT(*) n FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY wk ORDER BY wk", (uid, start, end))
            return [("Weekly performance trend", ["Week", "Views", "Posts"], [[x["wk"], x["v"], x["n"]] for x in w]),
                    ("Format performance", ["Format", "Posts", "Avg views"], [[x["type"], x["n"], x["v"]] for x in h])]
        if kind == "platform":
            p = q(c, "SELECT platform, COUNT(*) posts, SUM(views) v, SUM(likes+comments+shares+saves) i FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY platform ORDER BY v DESC", (uid, start, end))
            r = {x["platform"]: x["a"] for x in q(c, "SELECT platform, ROUND(SUM(amount),2) a FROM revenue WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY platform", (uid, start, end))}
            return [("Platform comparison", ["Platform", "Posts", "Views", "Interactions", "ER %", "Revenue ($)"],
                     [[x["platform"], x["posts"], x["v"], x["i"], round(x["i"] / x["v"] * 100, 2) if x["v"] else 0, r.get(x["platform"], 0)] for x in p])]
    raise HTTPException(404, "Unknown report")


def to_csv(sections):
    buf = io.StringIO()
    w = csv.writer(buf)
    for h, cols, rows in sections:
        w.writerow([h]); w.writerow(cols); w.writerows(rows); w.writerow([])
    return buf.getvalue().encode(), "text/csv"


def to_xlsx(title, sections):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    wb = Workbook(); wb.remove(wb.active)
    for h, cols, rows in sections:
        ws = wb.create_sheet(h[:30])
        ws.append(cols)
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF"); cell.fill = PatternFill("solid", fgColor="6D28D9")
            cell.alignment = Alignment(horizontal="center")
        for r in rows:
            ws.append(r)
        for i, col in enumerate(cols, 1):
            width = max([len(str(col))] + [len(str(r[i - 1])) for r in rows]) + 3
            ws.column_dimensions[ws.cell(1, i).column_letter].width = min(width, 50)
    buf = io.BytesIO(); wb.save(buf)
    return buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def to_pdf(title, who, days, sections):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=30, rightMargin=30, topMargin=30, bottomMargin=30)
    st = getSampleStyleSheet()
    els = [Paragraph(f"CreatorIQ — {title}", st["Title"]),
           Paragraph(f"Creator: {who} &nbsp;|&nbsp; Last {days} days &nbsp;|&nbsp; Generated {datetime.now():%Y-%m-%d %H:%M}", st["Normal"]), Spacer(1, 14)]
    for h, cols, rows in sections:
        els.append(Paragraph(h, st["Heading2"]))
        data = [cols] + [[Paragraph(str(v), st["BodyText"]) if isinstance(v, str) and len(v) > 24 else v for v in r] for r in rows]
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6D28D9")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                               ("FONTSIZE", (0, 0), (-1, -1), 8), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F3FF")]), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        els += [t, Spacer(1, 14)]
    doc.build(els)
    return buf.getvalue(), "application/pdf"


@router.get("/{kind}")
def report(kind: str, fmt: str = Query("pdf", pattern="^(pdf|xlsx|csv)$"), days: int = Query(30, ge=7, le=365),
           uid: int = Depends(target_creator)):
    if kind not in KINDS:
        raise HTTPException(404, "Unknown report")
    sections = build(kind, uid, days)
    with db() as c:
        who = q1(c, "SELECT name FROM users WHERE id=?", (uid,))["name"]
    title = KINDS[kind]
    data, mime = {"csv": lambda: to_csv(sections), "xlsx": lambda: to_xlsx(title, sections),
                  "pdf": lambda: to_pdf(title, who, days, sections)}[fmt]()
    name = f"creatoriq_{kind}_{datetime.now():%Y%m%d}.{fmt}"
    return Response(data, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{name}"', "Access-Control-Expose-Headers": "Content-Disposition"})


@router.get("")
def list_reports():
    return [{"kind": k, "title": v} for k, v in KINDS.items()]
