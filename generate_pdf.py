import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def build_pdf():
    pdf_filename = "/Users/pranav/Desktop/saferoute/SafeRoute_Technical_Architecture_Guide.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER,
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        alignment=TA_CENTER,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'H1Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0284c7'),
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1e293b'),
        leftIndent=15,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderColor=colors.HexColor('#cbd5e1'),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    story = []

    # Title & Header
    story.append(Paragraph("🛡️ SafeRoute — Technical Architecture & System Guide", title_style))
    story.append(Paragraph("<b>AI-Powered Women's Safety Navigation Engine</b> | Live Production Architecture", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=12))

    # Executive Summary
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph("<b>The Problem:</b> Standard navigation platforms (Google Maps, Waze, Apple Maps) optimize exclusively for shortest distance or fastest travel time. They frequently guide pedestrians and drivers through dark, unlit back-alleys, isolated industrial zones, or high-crime corridors because it saves 60 seconds.", body_style))
    story.append(Paragraph("<b>The SafeRoute Solution:</b> SafeRoute evaluates street lighting sensors, police station proximity, nightfall risk multipliers, commercial footfall ('eyes on the street'), and crowd-sourced hazard reports to strictly prioritize <b>Women's Safety First</b>.", body_style))

    # Geocoding & OSRM Engine
    story.append(Paragraph("2. Geocoding & OSRM Road Network Engine", h1_style))
    story.append(Paragraph("• <b>Geocoding (Text to GPS)</b>: SafeRoute converts user location inputs into exact spatial coordinates via Nominatim OpenStreetMap API (e.g., Hitech City: 17.4435° N, 78.3772° E; Banjara Hills: 17.4150° N, 78.4350° E).", bullet_style))
    story.append(Paragraph("• <b>OSRM Road Geometry Query</b>: Queries OSRM API with GeoJSON enabled (https://router.project-osrm.org/route/v1/driving/...) to return array of coordinate waypoints along actual physical streets.", bullet_style))

    # Haversine Formula
    story.append(Paragraph("3. The Haversine Spatial Distance Formula", h1_style))
    story.append(Paragraph("SafeRoute executes the spherical <b>Haversine Distance Formula</b> to measure exact spatial distances on Earth's curved surface between moving users, road waypoints, police stations, and hazard pins:", body_style))
    story.append(Paragraph("<b>d = 2R · arcsin( √( sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2) ) )</b>", code_style))
    story.append(Paragraph("• <b>Police Proximity</b>: Scans for police stations & She Team kiosks within <b>1.0 km</b>.", bullet_style))
    story.append(Paragraph("• <b>Hospital Proximity</b>: Identifies 24/7 emergency medical centers within <b>1.5 km</b>.", bullet_style))
    story.append(Paragraph("• <b>Hazard Exposure Radius</b>: Checks for reported snatching/harassment pins within <b>500 meters</b>.", bullet_style))
    story.append(Paragraph("• <b>Off-Route 200m Safety Fence</b>: Triggers instant deviation warning if user moves >200m away from planned safe route.", bullet_style))

    # 5-Factor Scoring Model
    story.append(Paragraph("4. The 5-Factor Mathematical Safety Scoring Algorithm (0–100)", h1_style))
    story.append(Paragraph("SafeRoute starts every candidate route with <b>100 Base Points</b> and applies the mathematical scoring formula:", body_style))
    story.append(Paragraph("<b>Final Score = 100 - Unlit Penalty + Police Bonus - (Hazard Penalty × Night Multiplier) + Footfall Bonus</b>", code_style))

    # Scoring Table
    table_data = [
        [Paragraph("<b>Safety Factor</b>", body_style), Paragraph("<b>Weight</b>", body_style), Paragraph("<b>Operational Logic</b>", body_style)],
        [Paragraph("💡 Street Lighting", body_style), Paragraph("30%", body_style), Paragraph("OSM lit=yes tags + Municipal lighting hierarchy", body_style)],
        [Paragraph("🚓 Police & Emergency", body_style), Paragraph("25%", body_style), Paragraph("Haversine distance <= 1.0 km adds +15 bonus pts", body_style)],
        [Paragraph("⚠️ Hazard Incident Pins", body_style), Paragraph("20%", body_style), Paragraph("Snatching/harassment pins <= 500m deduct -20 to -35 pts", body_style)],
        [Paragraph("🌙 Nightfall Risk Shift", body_style), Paragraph("15%", body_style), Paragraph("8 PM to 5 AM applies 1.4x hazard penalty multiplier", body_style)],
        [Paragraph("🏪 Commercial Footfall", body_style), Paragraph("10%", body_style), Paragraph("Active shop/metro density per 100m adds +10 pts", body_style)]
    ]
    t = Table(table_data, colWidths=[150, 60, 320])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Lighting & Footfall
    story.append(Paragraph("5. Street Lighting & Commercial Footfall Intelligence", h1_style))
    story.append(Paragraph("• <b>3 Lighting Layers</b>: Combines OpenStreetMap infrastructure tags (lit=yes), municipal road hierarchy (commercial highways = 85-95% lit), and crowd-sourced 'Unlit Streetlight' hazard reports.", bullet_style))
    story.append(Paragraph("• <b>Commercial Footfall ('Eyes on the Street')</b>: Based on Jane Jacobs' urban safety principle. Streets with active retail stores, cafes, ATMs, and metro stations provide natural surveillance and emergency shelter access (+10 bonus pts).", bullet_style))

    # Emergency SOS Pipeline
    story.append(Paragraph("6. Zero-Delay Emergency SOS Pipeline (n8n + Twilio)", h1_style))
    story.append(Paragraph("• <b>CORS-Free Architecture</b>: Native HTML anchor triggers target a hidden background iframe, guaranteeing 0ms execution without browser CORS preflight blocking.", bullet_style))
    story.append(Paragraph("• <b>Cloud Phone Call Automation</b>: Triggers n8n production webhook (https://pranav3010.app.n8n.cloud/webhook/sos-trigger), which executes Twilio REST API to place a live voice call to +916300863028.", bullet_style))
    story.append(Paragraph("• <b>Multilingual Voice SOS Engine</b>: Web Speech API continuously listens for panic triggers ('HELP ME', 'SAVE ME', 'BACHAO', 'MADAD KARO').", bullet_style))

    # Hackathon Pitch Script
    story.append(Paragraph("7. Master Hackathon Presentation Pitch Script", h1_style))
    story.append(Paragraph("<i>'SafeRoute is a comprehensive women's safety navigation platform. Unlike standard navigation apps that only optimize for travel speed, SafeRoute combines real-time OSRM road geometry with the spatial Haversine distance formula to evaluate street lighting, police station proximity, nightfall risk multipliers, commercial footfall, and crowd-sourced hazard reports—strictly prioritizing safety over shortest distance. In an emergency, SafeRoute features zero-delay one-tap and hands-free voice SOS that triggers an n8n cloud automation pipeline—placing live phone calls via Twilio REST API to emergency contacts while broadcasting real-time GPS location tracking.'</i>", body_style))

    doc.build(story)
    print("PDF Generated Successfully at:", pdf_filename)

if __name__ == '__main__':
    build_pdf()
