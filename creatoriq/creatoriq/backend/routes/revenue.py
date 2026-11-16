"""Revenue Analytics module: sponsorships, ad revenue, earnings, trends, insights."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..config import REVENUE_SOURCES
from ..database import db, q, q1
from ..security import current_user, target_creator
from ..services.analytics import window, forecast, pct_change
from ..services import connectors

router = APIRouter(prefix="/api/revenue", tags=["revenue"])


class DealIn(BaseModel):
    source: str
    brand: str = ""
    platform: str = ""
    amount: float = Field(gt=0)
    date: str
    status: str = "Pending"
    notes: str = ""


@router.get("/summary")
def summary(days: int = Query(90, ge=7, le=365), uid: int = Depends(target_creator)):
    start, end, prev_start = window(days)
    with db() as c:
        tot = lambda a, b: q1(c, "SELECT COALESCE(SUM(amount),0) s FROM revenue WHERE user_id=? AND date BETWEEN ? AND ?", (uid, a, b))["s"]
        cur, prev = tot(start, end), tot(prev_start, start)
        by_source = q(c, "SELECT source, ROUND(SUM(amount),2) amount, COUNT(*) n FROM revenue WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY source ORDER BY amount DESC", (uid, start, end))
        by_platform = q(c, "SELECT platform, ROUND(SUM(amount),2) amount FROM revenue WHERE user_id=? AND date BETWEEN ? AND ? AND platform<>'' GROUP BY platform ORDER BY amount DESC", (uid, start, end))
        monthly = q(c, "SELECT strftime('%Y-%m', date) month, ROUND(SUM(amount),2) amount FROM revenue WHERE user_id=? GROUP BY month ORDER BY month DESC LIMIT 6", (uid,))[::-1]
        pending = q1(c, "SELECT COALESCE(SUM(amount),0) s, COUNT(*) n FROM revenue WHERE user_id=? AND status='Pending'", (uid,))
        top_brand = q1(c, "SELECT brand, ROUND(SUM(amount),2) amount FROM revenue WHERE user_id=? AND brand<>'' AND source IN ('Sponsorship','Brand Collaboration') GROUP BY brand ORDER BY amount DESC LIMIT 1", (uid,))
        avg_deal = q1(c, "SELECT ROUND(AVG(amount),2) a FROM revenue WHERE user_id=? AND source IN ('Sponsorship','Brand Collaboration')", (uid,))["a"]
        views = q1(c, "SELECT COALESCE(SUM(views),0) v FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ?", (uid, start, end))["v"]
    series = [m["amount"] for m in monthly]
    nxt = forecast(series, 1)[0] if len(series) >= 3 else None
    insights = []
    if top_brand:
        insights.append(f"Top sponsor: {top_brand['brand']} (${top_brand['amount']:,.0f}).")
    if views:
        insights.append(f"Revenue per 1,000 views (RPM): ${cur / views * 1000:,.2f}.")
    if by_source:
        share = by_source[0]["amount"] / cur * 100 if cur else 0
        insights.append(f"{by_source[0]['source']} is your biggest income stream ({share:.0f}% of revenue)." +
                        (" Consider diversifying." if share > 55 else ""))
    if nxt:
        insights.append(f"Projected next-month revenue: ${nxt:,.0f}.")
    if pending["n"]:
        insights.append(f"${pending['s']:,.0f} is waiting in {pending['n']} pending payment(s).")
    return {"total": round(cur, 2), "change": pct_change(cur, prev), "by_source": by_source, "by_platform": by_platform,
            "monthly": monthly, "pending": pending, "avg_deal": avg_deal, "rpm": round(cur / views * 1000, 2) if views else 0,
            "insights": insights}


@router.get("/deals")
def deals(source: Optional[str] = None, uid: int = Depends(target_creator)):
    sql, args = "SELECT * FROM revenue WHERE user_id=?", [uid]
    if source:
        sql += " AND source=?"; args.append(source)
    with db() as c:
        return q(c, sql + " ORDER BY date DESC LIMIT 200", args)


@router.post("/deals", status_code=201)
def add_deal(body: DealIn, user=Depends(current_user)):
    if body.source not in REVENUE_SOURCES:
        raise HTTPException(400, f"source must be one of {REVENUE_SOURCES}")
    with db() as c:
        c.execute("INSERT INTO revenue(user_id,source,platform,brand,amount,date,status,notes) VALUES(?,?,?,?,?,?,?,?)",
                  (user["id"], body.source, body.platform, body.brand, body.amount, body.date, body.status, body.notes))
        if user["role"] == "creator" and body.status == "Paid":
            connectors.notify(c, user["id"], "success", "Revenue received", f"${body.amount:,.0f} from {body.brand or body.source} recorded.")
    return {"ok": True}


@router.put("/deals/{did}/status")
def set_status(did: int, status: str, user=Depends(current_user)):
    if status not in ("Paid", "Pending", "Overdue"):
        raise HTTPException(400, "Invalid status")
    with db() as c:
        c.execute("UPDATE revenue SET status=? WHERE id=? AND user_id=?", (status, did, user["id"]))
    return {"ok": True}


@router.delete("/deals/{did}")
def delete_deal(did: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM revenue WHERE id=? AND user_id=?", (did, user["id"]))
    return {"ok": True}
