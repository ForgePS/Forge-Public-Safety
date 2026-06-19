# Sprint 14A - Enterprise MVIX Clone for Forge Academy

## Overview

Enterprise digital signage, dashboard, operations, and campus information system for the Arkansas Fire Training Academy.

This platform serves:

- Main Lobby Displays
- Classroom Displays
- Dormitory Displays
- Testing Center Displays
- Executive Dashboards
- Instructor Dashboards
- Dining Hall Displays

---

# Dining Services Module

## Purpose

Provide dining information across academy displays and student portals.

---

## Weekly Menu Management

Academy staff can manage:

- Weekly Menus
- Monthly Menus
- Holiday Menus
- Special Event Menus

---

## Daily Meal Structure

Monday
- Breakfast
- Lunch
- Dinner

Tuesday
- Breakfast
- Lunch
- Dinner

Wednesday
- Breakfast
- Lunch
- Dinner

Thursday
- Breakfast
- Lunch
- Dinner

Friday
- Breakfast
- Lunch
- Dinner

Saturday (Optional)
- Breakfast
- Lunch
- Dinner

Sunday (Optional)
- Breakfast
- Lunch
- Dinner

---

## Menu Database Structure

```typescript
interface DiningMenu {
  id: string;

  weekStartDate: string;

  monday: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  };

  tuesday: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  };

  wednesday: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  };

  thursday: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  };

  friday: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  };

  active: boolean;
}
```

Firestore collection: `digitalDashboardDiningMenus`

---

## Dining Widget

Displays:

- Today's Meals
- Weekly Menu
- Next Meal
- Special Events
- Dietary Notices

---

## Dietary Tags

Supported Tags:

- Vegetarian
- Vegan
- Gluten Free
- Dairy Free
- Nut Warning

Use bracket tags in menu lines, e.g. `Oatmeal [Vegetarian]`.

---

## Dining Dashboard

Widgets:

- Meals Served Today
- Weekly Menu Published
- Special Events
- Dietary Alerts

---

## Dining Display Locations

Deploy To:

- Main Lobby TV
- Dining Hall TV
- Dormitory TVs
- Student Portal
- Mobile App

---

# Display Management

- Unlimited Displays
- Display Groups
- Playlists
- Layout Builder
- Widget Library
- Scheduling Engine
- Emergency Alert Override
- Analytics

---

# Widgets

- Weather
- Announcements
- LMS Progress
- Testing Status
- Certification Status
- Housing Status
- Dining Services
- Emergency Alerts
- Custom HTML

---

# Future Enhancements

- Touchscreen Kiosks
- QR Codes
- Active911 Integration
- CAD Displays
- Hydrant Mapping
- Mobile Companion App

---

# Acceptance Criteria

System must:

- Manage unlimited displays
- Publish dining menus
- Schedule content
- Display academy information
- Push emergency alerts
- Support student-facing displays

## Implementation status (Forge Academy)

| Area | Status |
|------|--------|
| Dining menu CRUD | Done |
| Dining widget on wall player | Done |
| Dining hall display group + seed | Done |
| Student portal dining view | Future |
| Mobile app | Future |
