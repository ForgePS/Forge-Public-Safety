# Forge Displays Enterprise Platform
## Full Enterprise MVIX Replacement Specification
### Version 1.0

This document serves as the master specification for the Forge Displays platform, an enterprise digital signage, dashboard, alerting, analytics, and operations platform designed for fire academies, public safety agencies, municipalities, and training organizations.

Source: `Forge_Displays_Enterprise_MVIX_Replacement_Specification.md`

## Table of Contents

1. Executive Summary
2. Platform Architecture
3. Multi-Tenant Organizations
4. User Management
5. Display Management
6. Display Player Software
7. Device Provisioning
8. Display Groups
9. Layout Designer
10. Widget Framework
11. Widget Marketplace
12. Content Management
13. Media Library
14. Playlist Engine
15. Scheduling Engine
16. Emergency Notifications
17. Dining Services
18. Housing Operations
19. Academy Operations
20. Testing Center Displays
21. Certification Dashboards
22. Executive Dashboards
23. Analytics Engine
24. QR Code Services
25. Mobile App
26. Active911 Integration
27. CAD Integration
28. Security & Compliance
29. API Architecture
30. Deployment Architecture

---

# Display Management Detailed Requirements

## Display Registration
Required Fields:
- Display Name — **Done**
- Asset ID — **Done**
- Device ID — **Done**
- MAC Address — **Done**
- Physical Location — **Done**
- Resolution — **Done**
- Orientation — **Done**
- Assigned Group — **Done**

## Remote Management
- Restart Display — **Done** (Devices tab)
- Refresh Content — **Done**
- Emergency Override — **Done**
- Assign Playlist — **Done**
- Update Device — **Done**

## Health Monitoring
- Heartbeat every 60 seconds — **Done**
- Last Seen — **Done**
- Connectivity Status — **Done**
- Storage Utilization — **Done**
- Software Version — **Done**

---

# Widget Catalog

Core Widgets:
- Weather — **Done**
- Time & Date — **Done**
- Announcements — **Done**
- Emergency Alerts — **Done**
- LMS Progress — **Partial**
- Testing Status — **Partial**
- Housing Status — **Partial**
- Dining Menus — **Done**
- Certification Metrics — **Partial**
- Active911 Incidents — **Future**
- CAD Dashboard — **Future**
- QR Codes — **Partial**
- Video — **Done**
- PDF — **Done**
- PowerPoint — **Done**
- Custom HTML — **Done**

---

# Acceptance Criteria

| Requirement | Status |
|-------------|--------|
| Unlimited displays | Done |
| Multi-tenant environments | Future |
| Offline playback | Future |
| Real-time dashboard data | Partial |
| Emergency alerts | Done |
| Forge Academy integration | Done |
| Forge Public Safety integration | Future |
| Replace core MVIX functionality | Partial |

---

# Admin UI

Track live implementation status under **Admin → Digital Dashboard → Platform**.

Device provisioning and remote commands are under **Admin → Digital Dashboard → Devices**.
