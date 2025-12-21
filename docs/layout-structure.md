# App Layout Structure

## Overview

The application now features a modern, clean layout with sidebar navigation, header, and responsive design optimized for warehouse/storage compliance and Primus GFS document generation.

## Layout Components

### 1. **AppSidebar** (`components/AppSidebar.tsx`)
- Collapsible sidebar with all 6 Primus GFS modules
- Expandable/collapsible sections for each module
- Module sub-navigation items
- Dashboard overview link
- Settings section
- Version indicator (v4.0 Certified)
- Responsive mobile drawer

### 2. **AppHeader** (`components/AppHeader.tsx`)
- Global search bar
- Theme toggle (light/dark mode)
- Notifications bell
- User profile dropdown
- Sidebar toggle button

### 3. **Layout Hierarchy**
```
app/[locale]/layout.tsx (Root)
├── Theme Provider
├── Internationalization (next-intl)
└── Children (varies by route)
    ├── Home page (custom navigation)
    ├── Login page (no sidebar)
    └── Dashboard (nested layout)
        └── app/[locale]/dashboard/layout.tsx
            ├── SidebarProvider
            ├── AppSidebar
            ├── AppHeader
            └── Main content area
```

## Module Structure

The sidebar includes all 6 Primus GFS modules:

1. **Module 1**: FSMS & Document Control
2. **Module 2**: Field Operations
3. **Module 3**: Greenhouse Operations
4. **Module 4**: Harvest Crew
5. **Module 5**: Facility & Operations (Pest, Chemical, Sanitation)
6. **Module 6**: HACCP

## Color Theme

The app uses the color scheme defined in `globals.css`:
- **Primary**: Teal/Cyan (`#0ea5b7`)
- **Accent**: Cyan (`#06b6d4`)
- **Background**: Light gray (`#f8fafc`) / Dark (`#071426`)
- **Sidebar**: Matches background with subtle borders

## Dark Mode Support

The layout includes full dark mode support via `next-themes`:
- Automatic system theme detection
- Manual toggle in header
- Smooth transitions between themes
- All components styled for both modes

## Responsive Design

- **Desktop**: Full sidebar always visible (collapsible to icon-only)
- **Tablet**: Sidebar collapses to icons by default
- **Mobile**: Sidebar becomes a slide-out drawer

## Usage

### Dashboard Pages
All pages under `/[locale]/dashboard/*` automatically get the sidebar + header layout.

Example route structure:
```
/en/dashboard                          → Dashboard overview
/en/dashboard/module-1/document-control → Module 1 page
/en/dashboard/module-5/pest           → Module 5 Pest Control
```

### Public Pages
Pages outside `/dashboard` (like home, login) don't include the sidebar.

## Next Steps

1. Implement authentication-based navigation
2. Add role-based access control to modules
3. Connect real data from Primus system
4. Add breadcrumb navigation
5. Implement document generation flows
