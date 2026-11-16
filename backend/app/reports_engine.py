"""
CreatorIQ — Reports & Export Engine (Phase 7.5).

Generates professional, sanitized, and tamper-resistant exports in:
- CSV (text/csv)
- Excel (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- PDF (application/pdf)

Security & Data Integrity Guarantees:
1. Formula Injection Prevention: All text cells beginning with '=', '+', '-', '@', '\\t', '\\r'
   are sanitized with leading single-quote escaping unless they represent pure numeric literals.
2. Financial Precision: Reuses authoritative metrics and Decimal outputs calculated by roi_engine.py.
3. Missing/Unavailable Values: Explicitly output as 'N/A' (never fabricating zero for missing revenue/costs).
4. Cost Ambiguity Warnings: Explicitly flagged in report headers and summaries.
5. Role-Based Financial Masking: Automatically masks peer creator compensations for Creator roles.
"""

import io
import csv
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, List, Optional

import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)


# -----------------------------------------------------------------------------
# Security: Formula Injection Sanitization
# -----------------------------------------------------------------------------

def sanitize_value(val: Any) -> Any:
    """
    Prevents CSV / Excel formula injection (CWE-1236).
    If a cell value starts with '=', '+', '-', '@', '\\t', or '\\r',
    and is not a valid signed number, it prepends a single quote (').
    """
    if val is None:
        return "N/A"
    if isinstance(val, (int, float, Decimal)):
        return val
    s = str(val).strip()
    if not s:
        return ""
    if s[0] in ("=", "+", "-", "@", "\t", "\r"):
        # Permit valid negative/positive numbers
        try:
            float(s)
            return s
        except ValueError:
            return f"'{s}"
    return s


def format_display(val: Any, kind: str = "str") -> str:
    """Safely formats metrics for human-readable presentation in CSV/PDF."""
    if val is None or val == "N/A":
        return "N/A"
    try:
        if kind == "currency":
            return f"${float(val):,.2f}"
        elif kind == "pct":
            return f"{float(val):.2f}%"
        elif kind == "ratio":
            return f"{float(val):.2f}x"
        elif kind == "count":
            return f"{int(val):,}"
        elif kind == "rate":
            return f"${float(val):.2f}"
        return str(val)
    except (ValueError, TypeError):
        return str(val)


# -----------------------------------------------------------------------------
# 1. Multi-Campaign Summary Exports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_campaigns_summary_csv(report_data: Dict[str, Any]) -> str:
    """Generates sanitized CSV export for multi-campaign ROI overview."""
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    # Header metadata
    meta = report_data.get("metadata", {})
    writer.writerow([sanitize_value("# CREATORIQ CAMPAIGN ROI SUMMARY REPORT")])
    writer.writerow([sanitize_value(f"# Generated: {meta.get('generated_at')}")])
    writer.writerow([sanitize_value(f"# User Role: {meta.get('user_role')} (User #{meta.get('user_id')})")])
    writer.writerow([sanitize_value(f"# Accounting Mode: {meta.get('cost_mode')}")])
    writer.writerow([sanitize_value(f"# Demo Data Included: {'Yes' if meta.get('include_demo') else 'No'}")])
    writer.writerow([sanitize_value(f"# Ambiguity Detected: {'Yes' if report_data.get('has_ambiguity') else 'No'}")])
    writer.writerow([])

    # Consolidated Aggregate KPI Row
    writer.writerow([sanitize_value("CONSOLIDATED AGGREGATE METRICS")])
    agg_headers = [
        "Total Campaigns", "Total Budget", "Total Cost", "Attributed Revenue",
        "Consolidated ROI (%)", "Consolidated ROAS", "Impressions", "Engagements", "Overall CPM", "Overall CPE"
    ]
    agg = report_data.get("aggregates", {})
    agg_row = [
        agg.get("total_campaigns", 0),
        format_display(agg.get("total_budget"), "currency"),
        format_display(agg.get("total_cost"), "currency"),
        format_display(agg.get("total_revenue"), "currency"),
        format_display(agg.get("overall_roi_pct"), "pct"),
        format_display(agg.get("overall_roas"), "ratio"),
        format_display(agg.get("total_impressions"), "count"),
        format_display(agg.get("total_engagements"), "count"),
        format_display(agg.get("overall_cpm"), "rate"),
        format_display(agg.get("overall_cpe"), "rate")
    ]
    writer.writerow([sanitize_value(h) for h in agg_headers])
    writer.writerow([sanitize_value(c) for c in agg_row])
    writer.writerow([])

    # Detailed Campaigns Table
    writer.writerow([sanitize_value("CAMPAIGN-BY-CAMPAIGN BREAKDOWN")])
    headers = [
        "Campaign ID", "Campaign Title", "Client Name", "Brand", "Platform", "Status",
        "Demo?", "Budget ($)", "Direct Spend ($)", "Talent Spend ($)", "Total Cost ($)",
        "Attributed Revenue ($)", "ROI (%)", "ROAS", "Impressions", "Reach", "Engagements",
        "Clicks", "Conversions", "CPM ($)", "CPE ($)", "CTR (%)", "Conversion Rate (%)",
        "Cost Rule Applied", "Ambiguity Note"
    ]
    writer.writerow([sanitize_value(h) for h in headers])

    for c in report_data.get("campaigns", []):
        cost = c.get("cost", {})
        rev = c.get("revenue", {})
        metrics = c.get("metrics", {})
        totals = c.get("totals", {})

        row = [
            c.get("campaign_id"),
            c.get("title"),
            c.get("client_name"),
            c.get("brand_name") or "None",
            c.get("platform"),
            c.get("status"),
            "Yes" if c.get("is_demo") else "No",
            format_display(cost.get("budget"), "currency"),
            format_display(cost.get("direct_spend"), "currency"),
            format_display(cost.get("deduplicated_talent_total"), "currency"),
            format_display(cost.get("total_campaign_cost"), "currency"),
            format_display(rev.get("attributed_revenue"), "currency"),
            format_display(metrics.get("roi_pct"), "pct"),
            format_display(metrics.get("roas"), "ratio"),
            format_display(totals.get("impressions"), "count"),
            format_display(totals.get("reach"), "count"),
            format_display(totals.get("engagements"), "count"),
            format_display(totals.get("clicks"), "count"),
            format_display(totals.get("conversions"), "count"),
            format_display(metrics.get("cpm"), "rate"),
            format_display(metrics.get("cpe"), "rate"),
            format_display(metrics.get("ctr"), "pct"),
            format_display(metrics.get("conversion_rate"), "pct"),
            cost.get("cost_rule_applied"),
            cost.get("cost_ambiguity_note") or "None"
        ]
        writer.writerow([sanitize_value(val) for val in row])

    return output.getvalue()


def export_campaigns_summary_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    """Generates styled Excel workbook (.xlsx) for multi-campaign ROI overview."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Campaigns Summary"

    # Styling definitions
    brand_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    brand_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    kpi_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    kpi_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    regular_font = Font(name="Calibri", size=10, color="1E293B")
    title_font = Font(name="Calibri", size=15, bold=True, color="0F172A")
    meta_font = Font(name="Calibri", size=9, italic=True, color="64748B")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    # Title block
    ws["A1"] = "CreatorIQ — Multi-Campaign ROI & Performance Report"
    ws["A1"].font = title_font

    meta = report_data.get("metadata", {})
    ws["A2"] = f"Generated: {meta.get('generated_at')} | Role: {meta.get('user_role')} | Mode: {meta.get('cost_mode')} | Demo Included: {'Yes' if meta.get('include_demo') else 'No'}"
    ws["A2"].font = meta_font

    # Aggregate KPI Table
    ws["A4"] = "CONSOLIDATED AGGREGATE SUMMARY"
    ws["A4"].font = Font(name="Calibri", size=11, bold=True, color="0F172A")

    agg_headers = [
        "Campaigns", "Total Budget", "Total Cost", "Attributed Revenue",
        "Overall ROI (%)", "Overall ROAS", "Impressions", "Engagements", "Overall CPM", "Overall CPE"
    ]
    for col_idx, h in enumerate(agg_headers, start=1):
        cell = ws.cell(row=5, column=col_idx, value=sanitize_value(h))
        cell.font = brand_font
        cell.fill = brand_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    agg = report_data.get("aggregates", {})
    agg_row = [
        agg.get("total_campaigns", 0),
        format_display(agg.get("total_budget"), "currency"),
        format_display(agg.get("total_cost"), "currency"),
        format_display(agg.get("total_revenue"), "currency"),
        format_display(agg.get("overall_roi_pct"), "pct"),
        format_display(agg.get("overall_roas"), "ratio"),
        format_display(agg.get("total_impressions"), "count"),
        format_display(agg.get("total_engagements"), "count"),
        format_display(agg.get("overall_cpm"), "rate"),
        format_display(agg.get("overall_cpe"), "rate")
    ]
    for col_idx, val in enumerate(agg_row, start=1):
        cell = ws.cell(row=6, column=col_idx, value=sanitize_value(val))
        cell.font = kpi_font
        cell.fill = kpi_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Campaigns Table
    ws["A8"] = "CAMPAIGN-BY-CAMPAIGN BREAKDOWN"
    ws["A8"].font = Font(name="Calibri", size=11, bold=True, color="0F172A")

    headers = [
        "ID", "Campaign Title", "Client", "Brand", "Platform", "Status",
        "Demo", "Budget", "Direct Spend", "Talent Spend", "Total Cost",
        "Attributed Rev", "ROI (%)", "ROAS", "Impressions", "Reach", "Engagements",
        "Clicks", "Conversions", "CPM", "CPE", "CTR", "Conv Rate",
        "Cost Accounting Rule", "Ambiguity Note"
    ]
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=9, column=col_idx, value=sanitize_value(h))
        cell.font = brand_font
        cell.fill = brand_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    row_idx = 10
    for c in report_data.get("campaigns", []):
        cost = c.get("cost", {})
        rev = c.get("revenue", {})
        metrics = c.get("metrics", {})
        totals = c.get("totals", {})

        row_vals = [
            c.get("campaign_id"),
            c.get("title"),
            c.get("client_name"),
            c.get("brand_name") or "None",
            c.get("platform"),
            c.get("status"),
            "Yes" if c.get("is_demo") else "No",
            format_display(cost.get("budget"), "currency"),
            format_display(cost.get("direct_spend"), "currency"),
            format_display(cost.get("deduplicated_talent_total"), "currency"),
            format_display(cost.get("total_campaign_cost"), "currency"),
            format_display(rev.get("attributed_revenue"), "currency"),
            format_display(metrics.get("roi_pct"), "pct"),
            format_display(metrics.get("roas"), "ratio"),
            format_display(totals.get("impressions"), "count"),
            format_display(totals.get("reach"), "count"),
            format_display(totals.get("engagements"), "count"),
            format_display(totals.get("clicks"), "count"),
            format_display(totals.get("conversions"), "count"),
            format_display(metrics.get("cpm"), "rate"),
            format_display(metrics.get("cpe"), "rate"),
            format_display(metrics.get("ctr"), "pct"),
            format_display(metrics.get("conversion_rate"), "pct"),
            cost.get("cost_rule_applied"),
            cost.get("cost_ambiguity_note") or "None"
        ]

        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=sanitize_value(val))
            cell.font = regular_font
            cell.border = thin_border
            if col_idx in (1, 5, 6, 7):
                cell.alignment = Alignment(horizontal="center")
            elif col_idx in range(8, 24):
                cell.alignment = Alignment(horizontal="right")
            else:
                cell.alignment = Alignment(horizontal="left")
        row_idx += 1

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(min(max_len + 3, 40), 10)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_campaigns_summary_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    """Generates landscape PDF report for multi-campaign ROI overview."""
    stream = io.BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A')
    )
    meta_style = ParagraphStyle(
        'RepMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B')
    )
    section_style = ParagraphStyle(
        'RepSection',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A')
    )
    table_cell = ParagraphStyle(
        'RepCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B')
    )
    table_header = ParagraphStyle(
        'RepHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    elements = []

    # Title & Metadata
    elements.append(Paragraph("CreatorIQ — Multi-Campaign ROI & Performance Report", title_style))
    meta = report_data.get("metadata", {})
    meta_text = (
        f"<b>Generated:</b> {meta.get('generated_at')} | "
        f"<b>Role:</b> {meta.get('user_role')} (User #{meta.get('user_id')}) | "
        f"<b>Accounting Mode:</b> {meta.get('cost_mode')} | "
        f"<b>Demo Included:</b> {'Yes' if meta.get('include_demo') else 'No'}"
    )
    elements.append(Paragraph(meta_text, meta_style))
    elements.append(Spacer(1, 12))

    # Ambiguity Warning Callout if present
    if report_data.get("has_ambiguity"):
        warn_style = ParagraphStyle(
            'Warn',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#9A3412')
        )
        warn_text = (
            "<b>⚠️ Cost Ambiguity Notice:</b> One or more campaigns have both direct spend and creator commitments. "
            "Under authoritative mode, ambiguous totals are reported as 'N/A' to preserve financial auditability."
        )
        warn_table = Table([[Paragraph(warn_text, warn_style)]], colWidths=[720])
        warn_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF7ED')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#FDBA74')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(warn_table)
        elements.append(Spacer(1, 10))

    # Consolidated Aggregate KPI Summary
    elements.append(Paragraph("Consolidated Aggregate Performance", section_style))
    elements.append(Spacer(1, 4))

    agg = report_data.get("aggregates", {})
    agg_data = [
        [
            Paragraph("<b>Campaigns</b>", table_header),
            Paragraph("<b>Total Budget</b>", table_header),
            Paragraph("<b>Total Cost</b>", table_header),
            Paragraph("<b>Attributed Rev</b>", table_header),
            Paragraph("<b>Overall ROI</b>", table_header),
            Paragraph("<b>ROAS</b>", table_header),
            Paragraph("<b>Impressions</b>", table_header),
            Paragraph("<b>Engagements</b>", table_header),
            Paragraph("<b>CPM</b>", table_header),
            Paragraph("<b>CPE</b>", table_header),
        ],
        [
            Paragraph(str(agg.get("total_campaigns", 0)), table_cell),
            Paragraph(format_display(agg.get("total_budget"), "currency"), table_cell),
            Paragraph(format_display(agg.get("total_cost"), "currency"), table_cell),
            Paragraph(format_display(agg.get("total_revenue"), "currency"), table_cell),
            Paragraph(format_display(agg.get("overall_roi_pct"), "pct"), table_cell),
            Paragraph(format_display(agg.get("overall_roas"), "ratio"), table_cell),
            Paragraph(format_display(agg.get("total_impressions"), "count"), table_cell),
            Paragraph(format_display(agg.get("total_engagements"), "count"), table_cell),
            Paragraph(format_display(agg.get("overall_cpm"), "rate"), table_cell),
            Paragraph(format_display(agg.get("overall_cpe"), "rate"), table_cell),
        ]
    ]
    agg_table = Table(agg_data, colWidths=[72] * 10)
    agg_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(agg_table)
    elements.append(Spacer(1, 14))

    # Campaign-by-Campaign Table
    elements.append(Paragraph("Campaign Breakdown", section_style))
    elements.append(Spacer(1, 4))

    camp_headers = [
        Paragraph("<b>Campaign</b>", table_header),
        Paragraph("<b>Platform</b>", table_header),
        Paragraph("<b>Status</b>", table_header),
        Paragraph("<b>Cost</b>", table_header),
        Paragraph("<b>Attributed Rev</b>", table_header),
        Paragraph("<b>ROI (%)</b>", table_header),
        Paragraph("<b>ROAS</b>", table_header),
        Paragraph("<b>Impressions</b>", table_header),
        Paragraph("<b>Engagements</b>", table_header),
        Paragraph("<b>CPM</b>", table_header),
        Paragraph("<b>CPE</b>", table_header),
    ]
    camp_table_data = [camp_headers]

    for c in report_data.get("campaigns", []):
        cost = c.get("cost", {})
        rev = c.get("revenue", {})
        metrics = c.get("metrics", {})
        totals = c.get("totals", {})

        title_str = f"<b>{c.get('title')}</b><br/><font color='#64748B'>{c.get('client_name')}</font>"
        if c.get("is_demo"):
            title_str = "<font color='#D97706'>[DEMO]</font> " + title_str

        camp_table_data.append([
            Paragraph(title_str, table_cell),
            Paragraph(str(c.get("platform")).capitalize(), table_cell),
            Paragraph(str(c.get("status")).capitalize(), table_cell),
            Paragraph(format_display(cost.get("total_campaign_cost"), "currency"), table_cell),
            Paragraph(format_display(rev.get("attributed_revenue"), "currency"), table_cell),
            Paragraph(format_display(metrics.get("roi_pct"), "pct"), table_cell),
            Paragraph(format_display(metrics.get("roas"), "ratio"), table_cell),
            Paragraph(format_display(totals.get("impressions"), "count"), table_cell),
            Paragraph(format_display(totals.get("engagements"), "count"), table_cell),
            Paragraph(format_display(metrics.get("cpm"), "rate"), table_cell),
            Paragraph(format_display(metrics.get("cpe"), "rate"), table_cell),
        ])

    col_widths = [150, 55, 55, 65, 75, 55, 50, 65, 65, 45, 40]
    camp_table = Table(camp_table_data, colWidths=col_widths, repeatRows=1)
    camp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(camp_table)

    # Footer note
    elements.append(Spacer(1, 14))
    elements.append(Paragraph(
        "Report generated by CreatorIQ Analytics & Reporting Engine. Financial figures are subject to accounting rules specified in request parameters.",
        meta_style
    ))

    doc.build(elements)
    stream.seek(0)
    return stream


# -----------------------------------------------------------------------------
# 2. Single Campaign Deep-Dive Exports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_single_campaign_csv(report_data: Dict[str, Any]) -> str:
    """Generates sanitized CSV export for single-campaign deep dive."""
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    camp = report_data.get("campaign", {})
    cost = report_data.get("cost", {})
    rev = report_data.get("revenue", {})
    metrics = report_data.get("metrics", {})
    totals = report_data.get("totals", {})
    creators = report_data.get("creators", [])
    milestones = report_data.get("milestones", [])

    # Header metadata
    writer.writerow([sanitize_value("# CREATORIQ SINGLE CAMPAIGN DEEP DIVE REPORT")])
    writer.writerow([sanitize_value(f"# Campaign: {camp.get('title')} (ID: #{camp.get('id')})")])
    writer.writerow([sanitize_value(f"# Client: {camp.get('client_name')} | Platform: {camp.get('platform')}")])
    writer.writerow([sanitize_value(f"# Status: {camp.get('status')} | Demo: {'Yes' if camp.get('is_demo') else 'No'}")])
    writer.writerow([sanitize_value(f"# Cost Mode: {report_data.get('cost_mode')}")])
    writer.writerow([sanitize_value(f"# Generated: {report_data.get('generated_at')}")])
    writer.writerow([])

    # Section 1: Financial & ROI Overview
    writer.writerow([sanitize_value("SECTION 1: FINANCIAL & ROI PERFORMANCE")])
    fin_headers = ["Metric", "Value", "Notes"]
    writer.writerow([sanitize_value(h) for h in fin_headers])
    fin_rows = [
        ["Budget", format_display(cost.get("budget"), "currency"), "Allocated spending cap"],
        ["Direct Spend (Campaign.spent)", format_display(cost.get("direct_spend"), "currency"), "Paid media & agency production"],
        ["Talent Commitments (Deduplicated)", format_display(cost.get("deduplicated_talent_total"), "currency"), "Agreed creator fees & sponsorships"],
        ["Total Campaign Cost", format_display(cost.get("total_campaign_cost"), "currency"), f"Rule: {cost.get('cost_rule_applied')}"],
        ["Budget Utilization", format_display(cost.get("budget_utilization_pct"), "pct"), "Cost vs Budget"],
        ["Attributed Revenue", format_display(rev.get("attributed_revenue"), "currency"), f"Status: {rev.get('attribution_status')}"],
        ["Return on Investment (ROI %)", format_display(metrics.get("roi_pct"), "pct"), "((Revenue - Cost) / Cost) * 100"],
        ["Return on Ad Spend (ROAS)", format_display(metrics.get("roas"), "ratio"), "Revenue / Cost"],
        ["Cost Per Mille (CPM)", format_display(metrics.get("cpm"), "rate"), "(Cost / Impressions) * 1000"],
        ["Cost Per Engagement (CPE)", format_display(metrics.get("cpe"), "rate"), "Cost / Engagements"],
        ["Click-Through Rate (CTR %)", format_display(metrics.get("ctr"), "pct"), "(Clicks / Impressions) * 100"],
        ["Conversion Rate (%)", format_display(metrics.get("conversion_rate"), "pct"), "(Conversions / Clicks) * 100"],
        ["Engagement Rate (%)", format_display(metrics.get("engagement_rate"), "pct"), "(Engagements / Reach) * 100"],
        ["Total Impressions", format_display(totals.get("impressions"), "count"), "Total milestone impressions"],
        ["Total Reach", format_display(totals.get("reach"), "count"), "Unique audience reached"],
        ["Total Engagements", format_display(totals.get("engagements"), "count"), "Likes, comments, shares"],
        ["Total Clicks", format_display(totals.get("clicks"), "count"), "Outbound link clicks"],
        ["Total Conversions", format_display(totals.get("conversions"), "count"), "Attributed sales / actions"],
    ]
    for r in fin_rows:
        writer.writerow([sanitize_value(c) for c in r])
    writer.writerow([])

    # Section 2: Creator Roster & Deliverables
    writer.writerow([sanitize_value("SECTION 2: CREATOR ROSTER & DELIVERABLES")])
    cr_headers = [
        "Creator ID", "Creator Name", "Creator Email", "Status", "Deliverables",
        "Compensation ($)", "Impressions", "Reach", "Engagements", "Clicks", "Conversions",
        "Attributed Rev ($)", "ROI (%)", "ROAS", "CPM ($)", "CPE ($)"
    ]
    writer.writerow([sanitize_value(h) for h in cr_headers])
    for cr in creators:
        cr_row = [
            cr.get("creator_id"),
            cr.get("creator_name"),
            cr.get("creator_email") or "N/A",
            cr.get("status"),
            cr.get("deliverables") or "None",
            cr.get("agreed_compensation_display", format_display(cr.get("agreed_compensation"), "currency")),
            format_display(cr.get("impressions"), "count"),
            format_display(cr.get("reach"), "count"),
            format_display(cr.get("engagements"), "count"),
            format_display(cr.get("clicks"), "count"),
            format_display(cr.get("conversions"), "count"),
            format_display(cr.get("revenue"), "currency"),
            format_display(cr.get("roi_pct"), "pct"),
            format_display(cr.get("roas"), "ratio"),
            format_display(cr.get("cpm"), "rate"),
            format_display(cr.get("cpe"), "rate")
        ]
        writer.writerow([sanitize_value(c) for c in cr_row])
    writer.writerow([])

    # Section 3: Performance Milestones
    writer.writerow([sanitize_value("SECTION 3: PERFORMANCE MILESTONES TIMELINE")])
    m_headers = [
        "Milestone ID", "Reporting Date", "Data Source", "Creator ID", "Creator Name",
        "Impressions", "Reach", "Engagements", "Clicks", "Conversions", "Revenue ($)", "Archived"
    ]
    writer.writerow([sanitize_value(h) for h in m_headers])
    for m in milestones:
        m_row = [
            m.get("id"),
            m.get("reporting_date"),
            m.get("data_source"),
            m.get("creator_id") or "Unassigned",
            m.get("creator_name") or "Unassigned",
            format_display(m.get("impressions"), "count"),
            format_display(m.get("reach"), "count"),
            format_display(m.get("engagements"), "count"),
            format_display(m.get("clicks"), "count"),
            format_display(m.get("conversions"), "count"),
            format_display(m.get("revenue"), "currency"),
            "Yes" if m.get("is_archived") else "No"
        ]
        writer.writerow([sanitize_value(c) for c in m_row])

    return output.getvalue()


def export_single_campaign_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    """Generates styled multi-tab Excel workbook (.xlsx) for single-campaign deep dive."""
    wb = Workbook()

    brand_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    brand_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    section_font = Font(name="Calibri", size=11, bold=True, color="0F172A")
    title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    regular_font = Font(name="Calibri", size=10, color="1E293B")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    camp = report_data.get("campaign", {})
    cost = report_data.get("cost", {})
    rev = report_data.get("revenue", {})
    metrics = report_data.get("metrics", {})
    totals = report_data.get("totals", {})
    creators = report_data.get("creators", [])
    milestones = report_data.get("milestones", [])

    # Tab 1: Executive Financial Summary
    ws1 = wb.active
    ws1.title = "Executive Summary"
    ws1["A1"] = f"Campaign #{camp.get('id')}: {camp.get('title')}"
    ws1["A1"].font = title_font
    ws1["A2"] = f"Client: {camp.get('client_name')} | Platform: {camp.get('platform')} | Status: {camp.get('status')} | Cost Mode: {report_data.get('cost_mode')}"
    ws1["A2"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

    ws1["A4"] = "FINANCIAL & ROI RECONCILIATION"
    ws1["A4"].font = section_font

    ws1.cell(row=5, column=1, value="Metric").font = brand_font
    ws1.cell(row=5, column=1).fill = brand_fill
    ws1.cell(row=5, column=2, value="Value").font = brand_font
    ws1.cell(row=5, column=2).fill = brand_fill
    ws1.cell(row=5, column=3, value="Notes & Formulas").font = brand_font
    ws1.cell(row=5, column=3).fill = brand_fill

    fin_rows = [
        ["Budget", format_display(cost.get("budget"), "currency"), "Allocated spending cap"],
        ["Direct Spend (Campaign.spent)", format_display(cost.get("direct_spend"), "currency"), "Direct media and operational invoices"],
        ["Talent Commitments", format_display(cost.get("deduplicated_talent_total"), "currency"), "Agreed creator compensations & sponsorships"],
        ["Total Campaign Cost", format_display(cost.get("total_campaign_cost"), "currency"), f"Rule: {cost.get('cost_rule_applied')}"],
        ["Budget Utilization", format_display(cost.get("budget_utilization_pct"), "pct"), "Cost vs Budget cap"],
        ["Attributed Revenue", format_display(rev.get("attributed_revenue"), "currency"), f"Status: {rev.get('attribution_status')}"],
        ["Return on Investment (ROI %)", format_display(metrics.get("roi_pct"), "pct"), "((Revenue - Cost) / Cost) * 100"],
        ["Return on Ad Spend (ROAS)", format_display(metrics.get("roas"), "ratio"), "Revenue / Cost"],
        ["Cost Per Mille (CPM)", format_display(metrics.get("cpm"), "rate"), "(Cost / Impressions) * 1000"],
        ["Cost Per Engagement (CPE)", format_display(metrics.get("cpe"), "rate"), "Cost / Engagements"],
        ["Click-Through Rate (CTR %)", format_display(metrics.get("ctr"), "pct"), "(Clicks / Impressions) * 100"],
        ["Conversion Rate (%)", format_display(metrics.get("conversion_rate"), "pct"), "(Conversions / Clicks) * 100"],
        ["Engagement Rate (%)", format_display(metrics.get("engagement_rate"), "pct"), "(Engagements / Reach) * 100"],
        ["Total Impressions", format_display(totals.get("impressions"), "count"), "Total verified impressions"],
        ["Total Reach", format_display(totals.get("reach"), "count"), "Total audience reach"],
        ["Total Engagements", format_display(totals.get("engagements"), "count"), "Total interactions"],
        ["Total Clicks", format_display(totals.get("clicks"), "count"), "Link clicks"],
        ["Total Conversions", format_display(totals.get("conversions"), "count"), "Direct sales & conversions"]
    ]

    for idx, (m, v, n) in enumerate(fin_rows, start=6):
        c1 = ws1.cell(row=idx, column=1, value=sanitize_value(m))
        c2 = ws1.cell(row=idx, column=2, value=sanitize_value(v))
        c3 = ws1.cell(row=idx, column=3, value=sanitize_value(n))
        for c in (c1, c2, c3):
            c.font = regular_font
            c.border = thin_border

    for col in ws1.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws1.column_dimensions[col_letter].width = max(min(max_len + 3, 50), 12)

    # Tab 2: Creator Deliverables Roster
    ws2 = wb.create_sheet(title="Creator Deliverables")
    ws2["A1"] = f"Creator Roster — {camp.get('title')}"
    ws2["A1"].font = title_font

    cr_headers = [
        "Creator ID", "Creator Name", "Email", "Status", "Deliverables",
        "Compensation", "Impressions", "Reach", "Engagements", "Clicks", "Conversions",
        "Revenue", "ROI (%)", "ROAS", "CPM", "CPE"
    ]
    for col_idx, h in enumerate(cr_headers, start=1):
        cell = ws2.cell(row=3, column=col_idx, value=sanitize_value(h))
        cell.font = brand_font
        cell.fill = brand_fill
        cell.alignment = Alignment(horizontal="center")

    for r_idx, cr in enumerate(creators, start=4):
        vals = [
            cr.get("creator_id"),
            cr.get("creator_name"),
            cr.get("creator_email") or "N/A",
            cr.get("status"),
            cr.get("deliverables") or "None",
            cr.get("agreed_compensation_display", format_display(cr.get("agreed_compensation"), "currency")),
            format_display(cr.get("impressions"), "count"),
            format_display(cr.get("reach"), "count"),
            format_display(cr.get("engagements"), "count"),
            format_display(cr.get("clicks"), "count"),
            format_display(cr.get("conversions"), "count"),
            format_display(cr.get("revenue"), "currency"),
            format_display(cr.get("roi_pct"), "pct"),
            format_display(cr.get("roas"), "ratio"),
            format_display(cr.get("cpm"), "rate"),
            format_display(cr.get("cpe"), "rate")
        ]
        for col_idx, val in enumerate(vals, start=1):
            cell = ws2.cell(row=r_idx, column=col_idx, value=sanitize_value(val))
            cell.font = regular_font
            cell.border = thin_border
            if col_idx in (1, 4):
                cell.alignment = Alignment(horizontal="center")
            elif col_idx in range(6, 17):
                cell.alignment = Alignment(horizontal="right")

    for col in ws2.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws2.column_dimensions[col_letter].width = max(min(max_len + 3, 35), 10)

    # Tab 3: Performance Milestones
    ws3 = wb.create_sheet(title="Milestones Timeline")
    ws3["A1"] = f"Milestones Timeline — {camp.get('title')}"
    ws3["A1"].font = title_font

    m_headers = [
        "Milestone ID", "Date", "Source", "Creator ID", "Creator Name",
        "Impressions", "Reach", "Engagements", "Clicks", "Conversions", "Revenue", "Archived"
    ]
    for col_idx, h in enumerate(m_headers, start=1):
        cell = ws3.cell(row=3, column=col_idx, value=sanitize_value(h))
        cell.font = brand_font
        cell.fill = brand_fill
        cell.alignment = Alignment(horizontal="center")

    for r_idx, m in enumerate(milestones, start=4):
        vals = [
            m.get("id"),
            m.get("reporting_date"),
            m.get("data_source"),
            m.get("creator_id") or "Unassigned",
            m.get("creator_name") or "Unassigned",
            format_display(m.get("impressions"), "count"),
            format_display(m.get("reach"), "count"),
            format_display(m.get("engagements"), "count"),
            format_display(m.get("clicks"), "count"),
            format_display(m.get("conversions"), "count"),
            format_display(m.get("revenue"), "currency"),
            "Yes" if m.get("is_archived") else "No"
        ]
        for col_idx, val in enumerate(vals, start=1):
            cell = ws3.cell(row=r_idx, column=col_idx, value=sanitize_value(val))
            cell.font = regular_font
            cell.border = thin_border

    for col in ws3.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws3.column_dimensions[col_letter].width = max(min(max_len + 3, 30), 10)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_single_campaign_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    """Generates landscape PDF report for single-campaign deep dive."""
    stream = io.BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=colors.HexColor('#0F172A')
    )
    meta_style = ParagraphStyle(
        'RepMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#64748B')
    )
    section_style = ParagraphStyle(
        'RepSection',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0F172A')
    )
    table_cell = ParagraphStyle(
        'RepCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B')
    )
    table_header = ParagraphStyle(
        'RepHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    camp = report_data.get("campaign", {})
    cost = report_data.get("cost", {})
    rev = report_data.get("revenue", {})
    metrics = report_data.get("metrics", {})
    totals = report_data.get("totals", {})
    creators = report_data.get("creators", [])
    milestones = report_data.get("milestones", [])

    elements = []

    # Title & Metadata
    title_str = f"CreatorIQ — Campaign #{camp.get('id')}: {camp.get('title')}"
    if camp.get("is_demo"):
        title_str += " [DEMO DATA]"
    elements.append(Paragraph(title_str, title_style))

    meta_str = (
        f"<b>Client:</b> {camp.get('client_name')} | "
        f"<b>Brand:</b> {camp.get('brand_name') or 'N/A'} | "
        f"<b>Platform:</b> {str(camp.get('platform')).capitalize()} | "
        f"<b>Status:</b> {str(camp.get('status')).capitalize()} | "
        f"<b>Cost Mode:</b> {report_data.get('cost_mode')} | "
        f"<b>Generated:</b> {report_data.get('generated_at')}"
    )
    elements.append(Paragraph(meta_str, meta_style))
    elements.append(Spacer(1, 10))

    # Cost Ambiguity Note if present
    if cost.get("has_cost_ambiguity"):
        warn_style = ParagraphStyle('Warn', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=10.5, textColor=colors.HexColor('#9A3412'))
        warn_text = f"<b>⚠️ Financial Notice:</b> {cost.get('cost_ambiguity_note')}"
        w_tbl = Table([[Paragraph(warn_text, warn_style)]], colWidths=[720])
        w_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF7ED')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#FDBA74')),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(w_tbl)
        elements.append(Spacer(1, 8))

    # Section 1: Executive KPI Grid
    elements.append(Paragraph("1. Financial Summary & Efficiency Metrics", section_style))
    elements.append(Spacer(1, 4))

    kpi_grid_data = [
        [
            Paragraph("<b>Total Budget</b>", table_header),
            Paragraph("<b>Total Cost</b>", table_header),
            Paragraph("<b>Attributed Rev</b>", table_header),
            Paragraph("<b>ROI (%)</b>", table_header),
            Paragraph("<b>ROAS</b>", table_header),
            Paragraph("<b>CPM</b>", table_header),
            Paragraph("<b>CPE</b>", table_header),
            Paragraph("<b>CTR (%)</b>", table_header),
            Paragraph("<b>Conv Rate</b>", table_header),
        ],
        [
            Paragraph(format_display(cost.get("budget"), "currency"), table_cell),
            Paragraph(format_display(cost.get("total_campaign_cost"), "currency"), table_cell),
            Paragraph(format_display(rev.get("attributed_revenue"), "currency"), table_cell),
            Paragraph(format_display(metrics.get("roi_pct"), "pct"), table_cell),
            Paragraph(format_display(metrics.get("roas"), "ratio"), table_cell),
            Paragraph(format_display(metrics.get("cpm"), "rate"), table_cell),
            Paragraph(format_display(metrics.get("cpe"), "rate"), table_cell),
            Paragraph(format_display(metrics.get("ctr"), "pct"), table_cell),
            Paragraph(format_display(metrics.get("conversion_rate"), "pct"), table_cell),
        ]
    ]
    kpi_table = Table(kpi_grid_data, colWidths=[80] * 9)
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 12))

    # Section 2: Creator Deliverables Roster
    elements.append(Paragraph(f"2. Creator Deliverables Roster ({len(creators)} Creators)", section_style))
    elements.append(Spacer(1, 4))

    cr_headers = [
        Paragraph("<b>Creator</b>", table_header),
        Paragraph("<b>Status</b>", table_header),
        Paragraph("<b>Deliverables</b>", table_header),
        Paragraph("<b>Compensation</b>", table_header),
        Paragraph("<b>Impressions</b>", table_header),
        Paragraph("<b>Engagements</b>", table_header),
        Paragraph("<b>Revenue</b>", table_header),
        Paragraph("<b>ROI</b>", table_header),
        Paragraph("<b>ROAS</b>", table_header),
    ]
    cr_data = [cr_headers]
    for cr in creators:
        cr_data.append([
            Paragraph(f"<b>{cr.get('creator_name')}</b>", table_cell),
            Paragraph(str(cr.get("status")).capitalize(), table_cell),
            Paragraph(str(cr.get("deliverables") or "None")[:40], table_cell),
            Paragraph(cr.get("agreed_compensation_display", format_display(cr.get("agreed_compensation"), "currency")), table_cell),
            Paragraph(format_display(cr.get("impressions"), "count"), table_cell),
            Paragraph(format_display(cr.get("engagements"), "count"), table_cell),
            Paragraph(format_display(cr.get("revenue"), "currency"), table_cell),
            Paragraph(format_display(cr.get("roi_pct"), "pct"), table_cell),
            Paragraph(format_display(cr.get("roas"), "ratio"), table_cell),
        ])

    cr_table = Table(cr_data, colWidths=[120, 60, 130, 80, 80, 80, 70, 50, 50], repeatRows=1)
    cr_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(cr_table)
    elements.append(Spacer(1, 12))

    # Section 3: Performance Milestones
    if milestones:
        elements.append(Paragraph(f"3. Performance Milestones ({len(milestones)} Records)", section_style))
        elements.append(Spacer(1, 4))

        m_headers = [
            Paragraph("<b>Date</b>", table_header),
            Paragraph("<b>Source</b>", table_header),
            Paragraph("<b>Creator</b>", table_header),
            Paragraph("<b>Impressions</b>", table_header),
            Paragraph("<b>Reach</b>", table_header),
            Paragraph("<b>Engagements</b>", table_header),
            Paragraph("<b>Clicks</b>", table_header),
            Paragraph("<b>Conversions</b>", table_header),
            Paragraph("<b>Revenue</b>", table_header),
        ]
        m_data = [m_headers]
        for m in milestones[:15]:  # Show up to 15 in PDF summary
            m_data.append([
                Paragraph(str(m.get("reporting_date")), table_cell),
                Paragraph(str(m.get("data_source")).capitalize(), table_cell),
                Paragraph(str(m.get("creator_name") or "Unassigned"), table_cell),
                Paragraph(format_display(m.get("impressions"), "count"), table_cell),
                Paragraph(format_display(m.get("reach"), "count"), table_cell),
                Paragraph(format_display(m.get("engagements"), "count"), table_cell),
                Paragraph(format_display(m.get("clicks"), "count"), table_cell),
                Paragraph(format_display(m.get("conversions"), "count"), table_cell),
                Paragraph(format_display(m.get("revenue"), "currency"), table_cell),
            ])

        m_table = Table(m_data, colWidths=[70, 60, 110, 80, 80, 80, 70, 80, 90], repeatRows=1)
        m_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
        ]))
        elements.append(m_table)

    # Footer
    elements.append(Spacer(1, 14))
    elements.append(Paragraph(
        "CreatorIQ Financial Report. Confidential — For authorized campaign stakeholders only.",
        meta_style
    ))

    doc.build(elements)
    stream.seek(0)
    return stream


# -----------------------------------------------------------------------------
# 3. Creator Deliverables Summary Exports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_creators_summary_csv(report_data: Dict[str, Any]) -> str:
    """Generates sanitized CSV export for creator performance & deliverables."""
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    meta = report_data.get("metadata", {})
    writer.writerow([sanitize_value("# CREATORIQ CREATOR DELIVERABLES & PERFORMANCE REPORT")])
    writer.writerow([sanitize_value(f"# Generated: {meta.get('generated_at')}")])
    writer.writerow([sanitize_value(f"# User Role: {meta.get('user_role')} (User #{meta.get('user_id')})")])
    writer.writerow([sanitize_value(f"# Campaign Scope: {meta.get('campaign_scope')}")])
    writer.writerow([])

    headers = [
        "Campaign ID", "Campaign Title", "Creator ID", "Creator Name", "Creator Email",
        "Status", "Deliverables", "Compensation ($)", "Impressions", "Reach", "Engagements",
        "Clicks", "Conversions", "Revenue ($)", "ROI (%)", "ROAS", "CPM ($)", "CPE ($)",
        "CTR (%)", "Conversion Rate (%)"
    ]
    writer.writerow([sanitize_value(h) for h in headers])

    for cr in report_data.get("creators", []):
        row = [
            cr.get("campaign_id"),
            cr.get("campaign_title"),
            cr.get("creator_id"),
            cr.get("creator_name"),
            cr.get("creator_email") or "N/A",
            cr.get("status"),
            cr.get("deliverables") or "None",
            cr.get("agreed_compensation_display", format_display(cr.get("agreed_compensation"), "currency")),
            format_display(cr.get("impressions"), "count"),
            format_display(cr.get("reach"), "count"),
            format_display(cr.get("engagements"), "count"),
            format_display(cr.get("clicks"), "count"),
            format_display(cr.get("conversions"), "count"),
            format_display(cr.get("revenue"), "currency"),
            format_display(cr.get("roi_pct"), "pct"),
            format_display(cr.get("roas"), "ratio"),
            format_display(cr.get("cpm"), "rate"),
            format_display(cr.get("cpe"), "rate"),
            format_display(cr.get("ctr"), "pct"),
            format_display(cr.get("conversion_rate"), "pct"),
        ]
        writer.writerow([sanitize_value(c) for c in row])

    return output.getvalue()


def export_creators_summary_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    """Generates styled Excel workbook (.xlsx) for creator performance."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Creator Performance"

    brand_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    brand_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    regular_font = Font(name="Calibri", size=10, color="1E293B")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    meta = report_data.get("metadata", {})
    ws["A1"] = "CreatorIQ — Creator Deliverables & Performance Summary"
    ws["A1"].font = title_font
    ws["A2"] = f"Generated: {meta.get('generated_at')} | Role: {meta.get('user_role')} | Scope: {meta.get('campaign_scope')}"
    ws["A2"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

    headers = [
        "Campaign ID", "Campaign Title", "Creator ID", "Creator Name", "Email",
        "Status", "Deliverables", "Compensation", "Impressions", "Reach", "Engagements",
        "Clicks", "Conversions", "Revenue", "ROI (%)", "ROAS", "CPM", "CPE", "CTR", "Conv Rate"
    ]
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col_idx, value=sanitize_value(h))
        cell.font = brand_font
        cell.fill = brand_fill
        cell.alignment = Alignment(horizontal="center")

    for r_idx, cr in enumerate(report_data.get("creators", []), start=5):
        vals = [
            cr.get("campaign_id"),
            cr.get("campaign_title"),
            cr.get("creator_id"),
            cr.get("creator_name"),
            cr.get("creator_email") or "N/A",
            cr.get("status"),
            cr.get("deliverables") or "None",
            cr.get("agreed_compensation_display", format_display(cr.get("agreed_compensation"), "currency")),
            format_display(cr.get("impressions"), "count"),
            format_display(cr.get("reach"), "count"),
            format_display(cr.get("engagements"), "count"),
            format_display(cr.get("clicks"), "count"),
            format_display(cr.get("conversions"), "count"),
            format_display(cr.get("revenue"), "currency"),
            format_display(cr.get("roi_pct"), "pct"),
            format_display(cr.get("roas"), "ratio"),
            format_display(cr.get("cpm"), "rate"),
            format_display(cr.get("cpe"), "rate"),
            format_display(cr.get("ctr"), "pct"),
            format_display(cr.get("conversion_rate"), "pct")
        ]
        for col_idx, val in enumerate(vals, start=1):
            cell = ws.cell(row=r_idx, column=col_idx, value=sanitize_value(val))
            cell.font = regular_font
            cell.border = thin_border
            if col_idx in (1, 3, 6):
                cell.alignment = Alignment(horizontal="center")
            elif col_idx in range(8, 21):
                cell.alignment = Alignment(horizontal="right")

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(min(max_len + 3, 35), 10)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_creators_summary_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    """Generates landscape PDF report for creator performance."""
    stream = io.BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A')
    )
    meta_style = ParagraphStyle(
        'RepMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#64748B')
    )
    table_cell = ParagraphStyle(
        'RepCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B')
    )
    table_header = ParagraphStyle(
        'RepHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    elements = []
    meta = report_data.get("metadata", {})
    elements.append(Paragraph("CreatorIQ — Creator Performance & Deliverables Report", title_style))
    meta_text = (
        f"<b>Generated:</b> {meta.get('generated_at')} | "
        f"<b>Role:</b> {meta.get('user_role')} (User #{meta.get('user_id')}) | "
        f"<b>Scope:</b> {meta.get('campaign_scope')}"
    )
    elements.append(Paragraph(meta_text, meta_style))
    elements.append(Spacer(1, 10))

    headers = [
        Paragraph("<b>Campaign</b>", table_header),
        Paragraph("<b>Creator</b>", table_header),
        Paragraph("<b>Status</b>", table_header),
        Paragraph("<b>Deliverables</b>", table_header),
        Paragraph("<b>Compensation</b>", table_header),
        Paragraph("<b>Impressions</b>", table_header),
        Paragraph("<b>Engagements</b>", table_header),
        Paragraph("<b>Revenue</b>", table_header),
        Paragraph("<b>ROI</b>", table_header),
        Paragraph("<b>ROAS</b>", table_header),
    ]
    tbl_data = [headers]

    for cr in report_data.get("creators", []):
        tbl_data.append([
            Paragraph(f"#{cr.get('campaign_id')} {cr.get('campaign_title')}", table_cell),
            Paragraph(f"<b>{cr.get('creator_name')}</b>", table_cell),
            Paragraph(str(cr.get("status")).capitalize(), table_cell),
            Paragraph(str(cr.get("deliverables") or "None")[:35], table_cell),
            Paragraph(cr.get("agreed_compensation_display", format_display(cr.get("agreed_compensation"), "currency")), table_cell),
            Paragraph(format_display(cr.get("impressions"), "count"), table_cell),
            Paragraph(format_display(cr.get("engagements"), "count"), table_cell),
            Paragraph(format_display(cr.get("revenue"), "currency"), table_cell),
            Paragraph(format_display(cr.get("roi_pct"), "pct"), table_cell),
            Paragraph(format_display(cr.get("roas"), "ratio"), table_cell),
        ])

    table = Table(tbl_data, colWidths=[110, 100, 50, 110, 75, 70, 70, 65, 40, 35], repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(table)

    elements.append(Spacer(1, 14))
    elements.append(Paragraph(
        "CreatorIQ Reporting Engine — Authorized and confidential distribution only.",
        meta_style
    ))

    doc.build(elements)
    stream.seek(0)
    return stream



# -----------------------------------------------------------------------------
# Module 2 & 9: Content Performance Reports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_content_summary_csv(report_data: Dict[str, Any]) -> io.StringIO:
    output = io.StringIO()
    writer = csv.writer(output)
    meta = report_data.get("metadata", {})
    writer.writerow(["# CreatorIQ — Content Performance & Intelligence Report"])
    writer.writerow([f"# Generated: {meta.get('generated_at')}", f"Role: {meta.get('user_role')}"])
    writer.writerow([f"# Platform Filter: {meta.get('platform_filter')}", f"Date Range: {meta.get('date_range')}"])
    writer.writerow([])
    writer.writerow([
        "Content ID", "Title", "Platform", "Published Date",
        "Views", "Likes", "Comments", "Shares", "Saves",
        "Reach", "Watch Time (min)", "Engagement Rate (%)"
    ])
    for item in report_data.get("content", []):
        writer.writerow([
            sanitize_value(item.get("id")),
            sanitize_value(item.get("title")),
            sanitize_value(item.get("platform")),
            sanitize_value(item.get("published_at")),
            item.get("views", 0),
            item.get("likes", 0),
            item.get("comments", 0),
            item.get("shares", 0),
            item.get("saves", 0),
            item.get("reach", 0),
            item.get("watch_time_minutes", 0.0),
            f"{item.get('engagement_rate', 0.0):.2f}%"
        ])
    output.seek(0)
    return output


def export_content_summary_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Content Performance"
    meta = report_data.get("metadata", {})

    header_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
    sub_font = Font(name="Calibri", size=10, italic=True, color="64748B")
    tbl_hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    tbl_hdr_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")

    ws.append(["CreatorIQ — Content Performance & Intelligence Report"])
    ws.append([f"Generated: {meta.get('generated_at')} | Role: {meta.get('user_role')} | Range: {meta.get('date_range')}"])
    ws.append([])
    ws["A1"].font = header_font
    ws["A2"].font = sub_font

    headers = [
        "Content ID", "Title", "Platform", "Published Date",
        "Views", "Likes", "Comments", "Shares", "Saves",
        "Reach", "Watch Time (min)", "Engagement Rate"
    ]
    ws.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_num)
        cell.font = tbl_hdr_font
        cell.fill = tbl_hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for item in report_data.get("content", []):
        ws.append([
            sanitize_value(item.get("id")),
            sanitize_value(item.get("title")),
            sanitize_value(item.get("platform")),
            sanitize_value(item.get("published_at")),
            item.get("views", 0),
            item.get("likes", 0),
            item.get("comments", 0),
            item.get("shares", 0),
            item.get("saves", 0),
            item.get("reach", 0),
            item.get("watch_time_minutes", 0.0),
            item.get("engagement_rate", 0.0) / 100.0
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_content_summary_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    stream = io.BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=landscape(letter), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RepTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#0F172A'))
    meta_style = ParagraphStyle('RepMeta', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#64748B'))
    table_header = ParagraphStyle('RepTH', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.white, fontName='Helvetica-Bold')
    table_cell = ParagraphStyle('RepTD', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#1E293B'))

    elements = []
    meta = report_data.get("metadata", {})
    elements.append(Paragraph("CreatorIQ — Content Performance & Intelligence Report", title_style))
    elements.append(Paragraph(f"<b>Generated:</b> {meta.get('generated_at')} | <b>Platform:</b> {meta.get('platform_filter')} | <b>Date Range:</b> {meta.get('date_range')}", meta_style))
    elements.append(Spacer(1, 10))

    headers = [
        Paragraph("<b>Title</b>", table_header),
        Paragraph("<b>Platform</b>", table_header),
        Paragraph("<b>Published</b>", table_header),
        Paragraph("<b>Views</b>", table_header),
        Paragraph("<b>Likes</b>", table_header),
        Paragraph("<b>Comments</b>", table_header),
        Paragraph("<b>Shares</b>", table_header),
        Paragraph("<b>Reach</b>", table_header),
        Paragraph("<b>Watch Time</b>", table_header),
        Paragraph("<b>Eng Rate</b>", table_header),
    ]
    tbl_data = [headers]
    for item in report_data.get("content", []):
        tbl_data.append([
            Paragraph(str(item.get("title", ""))[:35], table_cell),
            Paragraph(str(item.get("platform", "")).capitalize(), table_cell),
            Paragraph(str(item.get("published_at", "")), table_cell),
            Paragraph(f"{item.get('views', 0):,}", table_cell),
            Paragraph(f"{item.get('likes', 0):,}", table_cell),
            Paragraph(f"{item.get('comments', 0):,}", table_cell),
            Paragraph(f"{item.get('shares', 0):,}", table_cell),
            Paragraph(f"{item.get('reach', 0):,}", table_cell),
            Paragraph(f"{item.get('watch_time_minutes', 0.0):.1f}m", table_cell),
            Paragraph(f"{item.get('engagement_rate', 0.0):.2f}%", table_cell),
        ])

    table = Table(tbl_data, colWidths=[180, 60, 65, 55, 50, 50, 50, 55, 60, 55], repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(table)
    doc.build(elements)
    stream.seek(0)
    return stream


# -----------------------------------------------------------------------------
# Module 3 & 9: Audience Demographics & Device Reports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_audience_summary_csv(report_data: Dict[str, Any]) -> io.StringIO:
    output = io.StringIO()
    writer = csv.writer(output)
    meta = report_data.get("metadata", {})
    writer.writerow(["# CreatorIQ — Audience Demographics & Device Intelligence Report"])
    writer.writerow([f"# Generated: {meta.get('generated_at')}", f"Role: {meta.get('user_role')}"])
    writer.writerow([])
    writer.writerow(["Platform", "Top Age Bracket", "Gender Breakdown", "Top Geographies", "Device Distribution (Mobile/Desktop/Tablet)"])
    for aud in report_data.get("audience", []):
        writer.writerow([
            sanitize_value(aud.get("platform")),
            sanitize_value(aud.get("top_age")),
            sanitize_value(aud.get("gender_str")),
            sanitize_value(aud.get("geo_str")),
            sanitize_value(aud.get("device_str"))
        ])
    output.seek(0)
    return output


def export_audience_summary_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Audience Analytics"
    meta = report_data.get("metadata", {})

    header_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
    sub_font = Font(name="Calibri", size=10, italic=True, color="64748B")
    tbl_hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    tbl_hdr_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")

    ws.append(["CreatorIQ — Audience Demographics & Device Intelligence Report"])
    ws.append([f"Generated: {meta.get('generated_at')} | Role: {meta.get('user_role')}"])
    ws.append([])
    ws["A1"].font = header_font
    ws["A2"].font = sub_font

    headers = ["Platform", "Top Age Bracket", "Gender Distribution", "Top Geographies", "Device Distribution"]
    ws.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_num)
        cell.font = tbl_hdr_font
        cell.fill = tbl_hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for aud in report_data.get("audience", []):
        ws.append([
            sanitize_value(aud.get("platform")),
            sanitize_value(aud.get("top_age")),
            sanitize_value(aud.get("gender_str")),
            sanitize_value(aud.get("geo_str")),
            sanitize_value(aud.get("device_str"))
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_audience_summary_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    stream = io.BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=landscape(letter), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RepTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#0F172A'))
    meta_style = ParagraphStyle('RepMeta', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#64748B'))
    table_header = ParagraphStyle('RepTH', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.white, fontName='Helvetica-Bold')
    table_cell = ParagraphStyle('RepTD', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#1E293B'))

    elements = []
    meta = report_data.get("metadata", {})
    elements.append(Paragraph("CreatorIQ — Audience Demographics & Device Intelligence Report", title_style))
    elements.append(Paragraph(f"<b>Generated:</b> {meta.get('generated_at')} | <b>Role:</b> {meta.get('user_role')}", meta_style))
    elements.append(Spacer(1, 10))

    headers = [
        Paragraph("<b>Platform</b>", table_header),
        Paragraph("<b>Top Age Bracket</b>", table_header),
        Paragraph("<b>Gender Distribution</b>", table_header),
        Paragraph("<b>Top Geographies</b>", table_header),
        Paragraph("<b>Device Distribution</b>", table_header),
    ]
    tbl_data = [headers]
    for aud in report_data.get("audience", []):
        tbl_data.append([
            Paragraph(str(aud.get("platform", "")).capitalize(), table_cell),
            Paragraph(str(aud.get("top_age", "N/A")), table_cell),
            Paragraph(str(aud.get("gender_str", "N/A")), table_cell),
            Paragraph(str(aud.get("geo_str", "N/A")), table_cell),
            Paragraph(str(aud.get("device_str", "N/A")), table_cell),
        ])

    table = Table(tbl_data, colWidths=[80, 100, 160, 170, 170], repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(table)
    doc.build(elements)
    stream.seek(0)
    return stream


# -----------------------------------------------------------------------------
# Module 5 & 9: 5-Source Revenue Breakdown Reports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_revenue_summary_csv(report_data: Dict[str, Any]) -> io.StringIO:
    output = io.StringIO()
    writer = csv.writer(output)
    meta = report_data.get("metadata", {})
    writer.writerow(["# CreatorIQ — 5-Source Revenue & Monetization Intelligence Report"])
    writer.writerow([f"# Generated: {meta.get('generated_at')}", f"Total Revenue: ${meta.get('total_revenue', 0.0):,.2f}"])
    writer.writerow([])
    writer.writerow(["Record ID", "Date", "Revenue Source", "Platform", "Amount ($)", "Notes/Description"])
    for rev in report_data.get("records", []):
        writer.writerow([
            sanitize_value(rev.get("id")),
            sanitize_value(rev.get("date")),
            sanitize_value(rev.get("source")),
            sanitize_value(rev.get("platform")),
            f"${rev.get('amount', 0.0):.2f}",
            sanitize_value(rev.get("notes") or "")
        ])
    output.seek(0)
    return output


def export_revenue_summary_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Revenue Analytics"
    meta = report_data.get("metadata", {})

    header_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
    sub_font = Font(name="Calibri", size=10, italic=True, color="64748B")
    tbl_hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    tbl_hdr_fill = PatternFill(start_color="047857", end_color="047857", fill_type="solid")

    ws.append(["CreatorIQ — 5-Source Revenue & Monetization Intelligence Report"])
    ws.append([f"Generated: {meta.get('generated_at')} | Total Revenue: ${meta.get('total_revenue', 0.0):,.2f}"])
    ws.append([])
    ws["A1"].font = header_font
    ws["A2"].font = sub_font

    headers = ["Record ID", "Date", "Revenue Source", "Platform", "Amount ($)", "Notes / Description"]
    ws.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_num)
        cell.font = tbl_hdr_font
        cell.fill = tbl_hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for rev in report_data.get("records", []):
        ws.append([
            sanitize_value(rev.get("id")),
            sanitize_value(rev.get("date")),
            sanitize_value(rev.get("source")),
            sanitize_value(rev.get("platform")),
            rev.get("amount", 0.0),
            sanitize_value(rev.get("notes") or "")
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_revenue_summary_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    stream = io.BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=landscape(letter), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RepTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#065F46'))
    meta_style = ParagraphStyle('RepMeta', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#64748B'))
    table_header = ParagraphStyle('RepTH', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.white, fontName='Helvetica-Bold')
    table_cell = ParagraphStyle('RepTD', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#1E293B'))

    elements = []
    meta = report_data.get("metadata", {})
    elements.append(Paragraph("CreatorIQ — 5-Source Revenue & Monetization Intelligence Report", title_style))
    elements.append(Paragraph(f"<b>Generated:</b> {meta.get('generated_at')} | <b>Total Revenue:</b> ${meta.get('total_revenue', 0.0):,.2f}", meta_style))
    elements.append(Spacer(1, 10))

    headers = [
        Paragraph("<b>Date</b>", table_header),
        Paragraph("<b>Source</b>", table_header),
        Paragraph("<b>Platform</b>", table_header),
        Paragraph("<b>Amount</b>", table_header),
        Paragraph("<b>Notes / Description</b>", table_header),
    ]
    tbl_data = [headers]
    for rev in report_data.get("records", []):
        tbl_data.append([
            Paragraph(str(rev.get("date", "")), table_cell),
            Paragraph(str(rev.get("source", "")), table_cell),
            Paragraph(str(rev.get("platform", "")).capitalize(), table_cell),
            Paragraph(f"${rev.get('amount', 0.0):,.2f}", table_cell),
            Paragraph(str(rev.get("notes") or "-")[:50], table_cell),
        ])

    table = Table(tbl_data, colWidths=[80, 140, 90, 90, 280], repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#065F46')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(table)
    doc.build(elements)
    stream.seek(0)
    return stream


# -----------------------------------------------------------------------------
# Module 4 & 9: Growth & Followers History Reports (CSV, XLSX, PDF)
# -----------------------------------------------------------------------------

def export_growth_summary_csv(report_data: Dict[str, Any]) -> io.StringIO:
    output = io.StringIO()
    writer = csv.writer(output)
    meta = report_data.get("metadata", {})
    writer.writerow(["# CreatorIQ — Follower Growth & Historical Reach Report"])
    writer.writerow([f"# Generated: {meta.get('generated_at')}", f"Role: {meta.get('user_role')}"])
    writer.writerow([])
    writer.writerow(["Date", "Platform", "Followers", "New Followers", "Impressions", "Reach"])
    for g in report_data.get("growth", []):
        writer.writerow([
            sanitize_value(g.get("date")),
            sanitize_value(g.get("platform")),
            g.get("followers", 0),
            g.get("new_followers", 0),
            g.get("impressions", 0),
            g.get("reach", 0),
        ])
    output.seek(0)
    return output


def export_growth_summary_xlsx(report_data: Dict[str, Any]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Follower Growth"
    meta = report_data.get("metadata", {})

    header_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
    sub_font = Font(name="Calibri", size=10, italic=True, color="64748B")
    tbl_hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    tbl_hdr_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")

    ws.append(["CreatorIQ — Follower Growth & Historical Reach Report"])
    ws.append([f"Generated: {meta.get('generated_at')} | Role: {meta.get('user_role')}"])
    ws.append([])
    ws["A1"].font = header_font
    ws["A2"].font = sub_font

    headers = ["Date", "Platform", "Followers", "New Followers", "Impressions", "Reach"]
    ws.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_num)
        cell.font = tbl_hdr_font
        cell.fill = tbl_hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for g in report_data.get("growth", []):
        ws.append([
            sanitize_value(g.get("date")),
            sanitize_value(g.get("platform")),
            g.get("followers", 0),
            g.get("new_followers", 0),
            g.get("impressions", 0),
            g.get("reach", 0),
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def export_growth_summary_pdf(report_data: Dict[str, Any]) -> io.BytesIO:
    stream = io.BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=landscape(letter), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RepTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#4338CA'))
    meta_style = ParagraphStyle('RepMeta', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#64748B'))
    table_header = ParagraphStyle('RepTH', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.white, fontName='Helvetica-Bold')
    table_cell = ParagraphStyle('RepTD', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#1E293B'))

    elements = []
    meta = report_data.get("metadata", {})
    elements.append(Paragraph("CreatorIQ — Follower Growth & Historical Reach Report", title_style))
    elements.append(Paragraph(f"<b>Generated:</b> {meta.get('generated_at')} | <b>Role:</b> {meta.get('user_role')}", meta_style))
    elements.append(Spacer(1, 10))

    headers = [
        Paragraph("<b>Date</b>", table_header),
        Paragraph("<b>Platform</b>", table_header),
        Paragraph("<b>Followers</b>", table_header),
        Paragraph("<b>New Followers</b>", table_header),
        Paragraph("<b>Impressions</b>", table_header),
        Paragraph("<b>Reach</b>", table_header),
    ]
    tbl_data = [headers]
    for g in report_data.get("growth", []):
        tbl_data.append([
            Paragraph(str(g.get("date", "")), table_cell),
            Paragraph(str(g.get("platform", "")).capitalize(), table_cell),
            Paragraph(f"{g.get('followers', 0):,}", table_cell),
            Paragraph(f"{g.get('new_followers', 0):,}", table_cell),
            Paragraph(f"{g.get('impressions', 0):,}", table_cell),
            Paragraph(f"{g.get('reach', 0):,}", table_cell),
        ])

    table = Table(tbl_data, colWidths=[100, 110, 110, 110, 120, 120], repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4338CA')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(table)
    doc.build(elements)
    stream.seek(0)
    return stream
