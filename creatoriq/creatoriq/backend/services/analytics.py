"""Shared analytics helpers: date windows, engagement rate, regression forecasting."""
from datetime import date, timedelta


def today():
    return date.today()


def window(days: int):
    """Return (start, end, prev_start) ISO dates for the current and previous windows."""
    end = today()
    start = end - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)
    return start.isoformat(), end.isoformat(), prev_start.isoformat()


def eng_rate(row):
    v = row.get("views") or 0
    if not v:
        return 0.0
    inter = (row.get("likes") or 0) + (row.get("comments") or 0) + (row.get("shares") or 0) + (row.get("saves") or 0)
    return round(inter / v * 100, 2)


def pct_change(cur, prev):
    if not prev:
        return None if not cur else 100.0
    return round((cur - prev) / prev * 100, 1)


def linreg(ys):
    """Least-squares line through (0..n-1, ys). Returns slope, intercept."""
    n = len(ys)
    if n < 2:
        return 0.0, (ys[0] if ys else 0.0)
    xs = range(n)
    mx, my = (n - 1) / 2, sum(ys) / n
    den = sum((x - mx) ** 2 for x in xs) or 1
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den
    return slope, my - slope * mx


def forecast(ys, steps):
    slope, icpt = linreg(ys)
    n = len(ys)
    return [max(0, round(icpt + slope * (n + i))) for i in range(steps)]


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)
