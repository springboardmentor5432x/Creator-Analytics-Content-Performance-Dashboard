"""
CreatorIQ — Campaign ROI & Performance Calculation Engine (Phase 7.3).

Implements authoritative, Decimal-precise metrics for:
- ROI (%) = ((Attributed Revenue - Total Campaign Cost) / Total Campaign Cost) * 100
- ROAS = Attributed Revenue / Total Campaign Cost
- CPM = (Campaign Cost / Impressions) * 1000
- CPE = Campaign Cost / Engagements
- CTR (%) = (Clicks / Impressions) * 100
- Conversion Rate (%) = (Conversions / Clicks) * 100
- Engagement Rate (%) = (Engagements / Reach) * 100

Features:
- Safe division by zero handling (returns None / null instead of throwing exceptions).
- Strict separation between ROI (%) and ROAS.
- Authoritative cost calculation avoiding double-counting between Campaign.spent,
  CampaignCreator agreed_compensation, and Sponsorship contract amounts.
- Transparent revenue attribution from verified CampaignPerformance milestones.
- Real vs. Demo data awareness.
- Archived record exclusion from active accounting calculations.
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Optional, Dict, Any, List
from datetime import date


def to_decimal(val: Any) -> Decimal:
    """Safely converts an int, float, or string to Decimal with 2 decimal places."""
    if val is None:
        return Decimal("0.00")
    try:
        return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


# -----------------------------------------------------------------------------
# Core Metric Mathematical Formulas (Zero-Safe, Decimal-Based)
# -----------------------------------------------------------------------------

def calculate_roi(revenue: Optional[Decimal], cost: Optional[Decimal]) -> Optional[float]:
    """
    ROI (%) = ((Attributed Revenue - Total Campaign Cost) / Total Campaign Cost) * 100.
    Returns None if cost is None, cost <= 0, or revenue is None.
    """
    if cost is None or cost <= Decimal("0") or revenue is None:
        return None
    try:
        roi = ((revenue - cost) / cost) * Decimal("100")
        return float(roi.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


def calculate_roas(revenue: Optional[Decimal], cost: Optional[Decimal]) -> Optional[float]:
    """
    ROAS = Attributed Revenue / Total Campaign Cost.
    Returns None if cost is None, cost <= 0, or revenue is None.
    """
    if cost is None or cost <= Decimal("0") or revenue is None:
        return None
    try:
        roas = revenue / cost
        return float(roas.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


def calculate_cpm(cost: Optional[Decimal], impressions: int) -> Optional[float]:
    """
    CPM = (Campaign Cost / Impressions) * 1000.
    Returns None if impressions <= 0 or cost is None or cost < 0.
    """
    if cost is None or cost < Decimal("0") or not impressions or impressions <= 0:
        return None
    try:
        cpm = (cost / Decimal(str(impressions))) * Decimal("1000")
        return float(cpm.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


def calculate_cpe(cost: Optional[Decimal], engagements: int) -> Optional[float]:
    """
    CPE = Campaign Cost / Engagements.
    Returns None if engagements <= 0 or cost is None or cost < 0.
    """
    if cost is None or cost < Decimal("0") or not engagements or engagements <= 0:
        return None
    try:
        cpe = cost / Decimal(str(engagements))
        return float(cpe.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


def calculate_ctr(clicks: int, impressions: int) -> Optional[float]:
    """
    CTR (%) = (Clicks / Impressions) * 100.
    Returns None if impressions <= 0.
    """
    if not impressions or impressions <= 0:
        return None
    try:
        ctr = (Decimal(str(clicks)) / Decimal(str(impressions))) * Decimal("100")
        return float(ctr.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


def calculate_conversion_rate(conversions: int, clicks: int) -> Optional[float]:
    """
    Conversion Rate (%) = (Conversions / Clicks) * 100.
    Returns None if clicks <= 0.
    """
    if not clicks or clicks <= 0:
        return None
    try:
        cr = (Decimal(str(conversions)) / Decimal(str(clicks))) * Decimal("100")
        return float(cr.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


def calculate_engagement_rate(engagements: int, reach: int) -> Optional[float]:
    """
    Engagement Rate (%) = (Engagements / Reach) * 100.
    Returns None if reach <= 0.
    """
    if not reach or reach <= 0:
        return None
    try:
        er = (Decimal(str(engagements)) / Decimal(str(reach))) * Decimal("100")
        return float(er.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except (ZeroDivisionError, InvalidOperation):
        return None


# -----------------------------------------------------------------------------
# Financial Cost Calculation Rule
# -----------------------------------------------------------------------------

def compute_campaign_cost(
    campaign,
    creators: list,
    sponsorships: list,
    cost_mode: str = "authoritative",
    include_archived: bool = False
) -> Dict[str, Any]:
    """
    Authoritative Campaign Cost Calculation.

    Establishes one clear, transparent rule that prevents double-counting between:
    - Direct spend recorded on Campaign.spent (e.g. ad spend, production, logistics).
    - Creator talent compensation recorded on CampaignCreator.agreed_compensation.
    - Brand sponsorship contracts recorded on Sponsorship.amount.

    Components:
    1. Direct Spend: Campaign.spent
    2. Creator Talent: Sum of active CampaignCreator.agreed_compensation (status != 'declined').
    3. Sponsorship Fees: Sum of active Sponsorship.amount linked to campaign (payment_status != 'cancelled').
       To avoid double-counting between CampaignCreator and Sponsorship for the same creator,
       we compute the incremental sponsorship commitment above agreed compensation.

    Rule Modes:
    - 'inclusive':
      Explicitly states that Campaign.spent encompasses creator/talent commitments.
      total_cost = direct_spend, rule = 'direct_spent_inclusive'
    - 'additive':
      Explicitly states that Campaign.spent excludes talent payments (is direct media/production spend only),
      so talent commitments are added.
      total_cost = direct_spend + talent_spend, rule = 'additive_direct_plus_talent'
    - 'direct_only':
      total_cost = direct_spend, rule = 'direct_spend_only'
    - 'talent_only':
      total_cost = talent_spend, rule = 'talent_spend_only'
    - 'authoritative' (default):
      Does not infer the relationship by comparing monetary amounts.
      If both direct_spend > 0 and talent_spend > 0, flags the semantic ambiguity,
      returns total_cost = None, and reports ROI as unavailable rather than publishing
      potentially inaccurate financial figures.
      If only direct_spend > 0, total_cost = direct_spend.
      If only talent_spend > 0, total_cost = talent_spend.
      If both 0, total_cost = 0.00.
    """
    direct_spend = to_decimal(getattr(campaign, "spent", 0.0))
    budget = to_decimal(getattr(campaign, "budget", 0.0))

    # Active creators filter
    active_creators = [
        c for c in creators
        if (include_archived or not getattr(c, "is_archived", False))
        and getattr(c, "status", "") != "declined"
    ]

    creator_comp_map = {}
    creator_items = []
    total_creator_comp = Decimal("0.00")
    for c in active_creators:
        comp = to_decimal(getattr(c, "agreed_compensation", 0.0))
        cid = getattr(c, "creator_id", 0)
        creator_comp_map[cid] = comp
        total_creator_comp += comp
        creator_items.append({
            "creator_id": cid,
            "creator_name": getattr(getattr(c, "creator", None), "full_name", None),
            "agreed_compensation": float(comp),
            "status": getattr(c, "status", "assigned"),
            "is_archived": getattr(c, "is_archived", False)
        })

    # Active sponsorships filter
    active_sponsorships = [
        s for s in sponsorships
        if (include_archived or not getattr(s, "is_archived", False))
        and getattr(s, "payment_status", "") != "cancelled"
    ]

    sponsorship_items = []
    total_sponsorship_amount = Decimal("0.00")
    incremental_sponsorship_amount = Decimal("0.00")

    for s in active_sponsorships:
        amt = to_decimal(getattr(s, "amount", 0.0))
        cid = getattr(s, "creator_id", 0)
        total_sponsorship_amount += amt

        # Deduplication against creator compensation
        existing_comp = creator_comp_map.get(cid, Decimal("0.00"))
        if amt > existing_comp:
            incremental_sponsorship_amount += (amt - existing_comp)

        sponsorship_items.append({
            "sponsorship_id": getattr(s, "id", None),
            "creator_id": cid,
            "creator_name": getattr(getattr(s, "creator", None), "full_name", None),
            "amount": float(amt),
            "payment_status": getattr(s, "payment_status", "pending"),
            "contract_status": getattr(s, "contract_status", "draft"),
            "is_archived": getattr(s, "is_archived", False)
        })

    # Deduplicated talent spend = creator compensation + incremental sponsorship fees
    talent_spend = total_creator_comp + incremental_sponsorship_amount

    has_ambiguity = False
    ambiguity_note = None

    if cost_mode == "inclusive":
        total_cost = direct_spend
        rule = "direct_spent_inclusive"
    elif cost_mode == "additive":
        total_cost = direct_spend + talent_spend
        rule = "additive_direct_plus_talent"
    elif cost_mode == "direct_only":
        total_cost = direct_spend
        rule = "direct_spend_only"
    elif cost_mode == "talent_only":
        total_cost = talent_spend
        rule = "talent_spend_only"
    else:
        # Default: authoritative
        # Do not infer relationship by comparing monetary amounts!
        if direct_spend > Decimal("0.00") and talent_spend > Decimal("0.00"):
            total_cost = None
            rule = "ambiguous_cost_components"
            has_ambiguity = True
            ambiguity_note = (
                f"Campaign.spent (${direct_spend}) and active talent commitments (${talent_spend}) both exist. "
                "The data model cannot establish whether Campaign.spent includes or excludes talent payments "
                "without an explicit cost_mode ('inclusive' or 'additive'). Total campaign cost and ROI are reported as "
                "unavailable to prevent publishing potentially inaccurate financial figures."
            )
        elif direct_spend > Decimal("0.00"):
            total_cost = direct_spend
            rule = "direct_spend_only"
        elif talent_spend > Decimal("0.00"):
            total_cost = talent_spend
            rule = "talent_commitments_only"
        else:
            total_cost = Decimal("0.00")
            rule = "zero_cost"

    budget_utilization_pct = None
    if total_cost is not None and budget > Decimal("0.00"):
        util = (total_cost / budget) * Decimal("100")
        budget_utilization_pct = float(util.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    return {
        "direct_spend": float(direct_spend),
        "creator_compensation_total": float(total_creator_comp),
        "sponsorship_total": float(total_sponsorship_amount),
        "deduplicated_talent_total": float(talent_spend),
        "total_campaign_cost": float(total_cost) if total_cost is not None else None,
        "total_cost_decimal": total_cost,
        "budget": float(budget),
        "budget_utilization_pct": budget_utilization_pct,
        "cost_rule_applied": rule,
        "has_cost_ambiguity": has_ambiguity,
        "cost_ambiguity_note": ambiguity_note,
        "active_creators_count": len(active_creators),
        "active_sponsorships_count": len(active_sponsorships),
        "creator_items": creator_items,
        "sponsorship_items": sponsorship_items
    }


# -----------------------------------------------------------------------------
# Revenue Attribution Engine
# -----------------------------------------------------------------------------

def compute_attributed_revenue(
    performances: list,
    include_archived: bool = False
) -> Dict[str, Any]:
    """
    Aggregates attributable revenue from verified CampaignPerformance records.

    Rules:
    - Only CampaignPerformance records associated with the target campaign are aggregated.
    - Distinguishes revenue by data source: 'manual', 'platform', 'youtube', 'instagram', 'tiktok', 'demo'.
    - If no performance records exist, reports revenue as unavailable (None) rather than guessing.
    - Excludes archived records unless include_archived=True.
    - Flags demo data explicitly.
    """
    valid_perfs = [
        p for p in performances
        if include_archived or not getattr(p, "is_archived", False)
    ]

    if not valid_perfs:
        return {
            "attributed_revenue": None,
            "revenue_decimal": None,
            "attribution_status": "unavailable",
            "revenue_by_source": {},
            "attribution_sources_count": 0,
            "has_demo_data": False,
            "limitations": "No CampaignPerformance milestones recorded for this campaign. Revenue tracking is unavailable."
        }

    revenue_by_source: Dict[str, Decimal] = {}
    total_rev = Decimal("0.00")
    has_demo = False

    for p in valid_perfs:
        amt = to_decimal(getattr(p, "revenue", 0.0))
        source = getattr(p, "data_source", "manual") or "manual"
        is_demo = getattr(p, "is_demo", False)
        if is_demo or source == "demo":
            has_demo = True

        revenue_by_source[source] = revenue_by_source.get(source, Decimal("0.00")) + amt
        total_rev += amt

    attribution_status = "zero_revenue_recorded" if total_rev == Decimal("0.00") else ("demo_attributed" if has_demo else "verified")

    return {
        "attributed_revenue": float(total_rev),
        "revenue_decimal": total_rev,
        "attribution_status": attribution_status,
        "revenue_by_source": {k: float(v) for k, v in revenue_by_source.items()},
        "attribution_sources_count": len(valid_perfs),
        "has_demo_data": has_demo,
        "limitations": "Attributed revenue is calculated exclusively from verified CampaignPerformance milestones linked directly to this campaign ID. Unlinked external revenue records are excluded to prevent cross-campaign revenue contamination."
    }


# -----------------------------------------------------------------------------
# Combined Performance & Core Metrics Engine
# -----------------------------------------------------------------------------

def aggregate_campaign_metrics(
    performances: list,
    cost_info: Dict[str, Any],
    revenue_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes consolidated performance totals and core ROI/efficiency metrics.
    """
    cost_decimal = cost_info.get("total_cost_decimal", to_decimal(cost_info.get("total_campaign_cost", 0.0)))
    rev_decimal = revenue_info.get("revenue_decimal")

    impressions = sum(getattr(p, "impressions", 0) for p in performances if not getattr(p, "is_archived", False))
    reach = sum(getattr(p, "reach", 0) for p in performances if not getattr(p, "is_archived", False))
    engagements = sum(getattr(p, "engagements", 0) for p in performances if not getattr(p, "is_archived", False))
    clicks = sum(getattr(p, "clicks", 0) for p in performances if not getattr(p, "is_archived", False))
    conversions = sum(getattr(p, "conversions", 0) for p in performances if not getattr(p, "is_archived", False))

    roi_pct = calculate_roi(rev_decimal, cost_decimal)
    roas = calculate_roas(rev_decimal, cost_decimal)
    cpm = calculate_cpm(cost_decimal, impressions)
    cpe = calculate_cpe(cost_decimal, engagements)
    ctr = calculate_ctr(clicks, impressions)
    conversion_rate = calculate_conversion_rate(conversions, clicks)
    engagement_rate = calculate_engagement_rate(engagements, reach)

    net_profit = None
    if rev_decimal is not None and cost_decimal is not None:
        net_profit = float((rev_decimal - cost_decimal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    return {
        "totals": {
            "impressions": impressions,
            "reach": reach,
            "engagements": engagements,
            "clicks": clicks,
            "conversions": conversions
        },
        "metrics": {
            "roi_pct": roi_pct,
            "roas": roas,
            "cpm": cpm,
            "cpe": cpe,
            "ctr": ctr,
            "conversion_rate": conversion_rate,
            "engagement_rate": engagement_rate,
            "net_profit": net_profit
        }
    }
