# Dashboard IA Redesign — 2026-05-11

## Context

The Home page was mixing four different "jobs to be done" in one scroll: project tracking (Tasks), daily ops checklist (TmsKpi, delivery items), analytics (AutoResearch), and system health (AgentFeed, SyncHealth). This caused cognitive load — users had to mentally filter what was relevant to them at any given moment.

This spec restructures the dashboard into MECE purpose-driven zones: one page per role (project workspace / ops checklist / domain analytics / system log), with TMS and WMS each offering three sub-views (업무처리 / 운영 / 분석) matching how logistics operations staff actually switch contexts.

---

## Final IA Structure

### Navigation (6 tabs)
```
Home | Ops | TMS | WMS | Vault | Log
```

### Page Definitions

#### Home (`/`) — Project Workspace
**Purpose:** Start-of-week project status at a glance. What are we building? What's the progress?

| Widget | Position |
|--------|----------|
| Tasks·Open | col-span-2 (left) |
| SimpleTodo | full width below |

**Removed from Home:** TmsKpi, AutoResearchTrend, AutoResearchLog, AgentFeed, SyncHealth → each relocated per below.

---

#### Ops (`/ops`) — Daily Operations Checklist ✦ NEW
**Purpose:** First tab opened every morning. Cross-domain actionable items that need attention today. Exception-first, time-sensitive.

| Widget | Position |
|--------|----------|
| TmsExceptionBanner | full width |
| TmsDeliveryNotes | 2-col left |
| TmsMultiTo | 2-col right |
| TmsDayoungSchedule | full width |
| WMS exceptions placeholder | full width (준비중) |

**Route:** `/ops`  
**File:** `web/src/pages/OpsPage.tsx` (new)

---

#### TMS (`/tms`) — Sub-tabs: [업무처리] [운영] [분석]
**Purpose:** Full TMS domain view. Sub-tabs switch context within the domain.

**[업무처리]** — actual work items (same data as Ops but full-detail, default tab)
- TmsDeliveryNotes + TmsMultiTo (2-col)
- TmsDayoungSchedule (full width)

**[운영]** — real-time operational monitoring
- TmsKpi (full width)
- TmsExceptionBanner (full width)
- TmsPodAging (full width)

**[분석]** — periodic performance analytics
- TmsOtifTrend + TmsCarrierRanking (2-col)
- TmsDailyVolume (full width)

---

#### WMS (`/wms`) — Sub-tabs: [업무처리] [운영] [분석]
**Purpose:** Full WMS domain view. Content for [업무처리] and [운영] TBD when WMS widgets are built.

**[업무처리]** — inbound GR, picking, outbound (placeholder)  
**[운영]** — stock monitoring, alerts (placeholder)  
**[분석]** — AutoResearchTrend + AutoResearchLog (moved from Home)

---

#### Log (`/log`) — System & Agent Activity
**Purpose:** System-level visibility. Not operational work, not analytics — diagnostic.

**Existing:** LogActivityTimeline + LogSyncHistory + LogErrorLog  
**Add:** AgentFeed (moved from Home) + SyncHealth (moved from Home)

---

#### Vault (`/vault`) — Unchanged
VaultResearchTimeline only. No changes.

---

## New Components

### `PageTabs` — reusable sub-tab component
**File:** `web/src/components/ui/page-tabs.tsx`

```tsx
// Usage:
<PageTabs
  tabs={[
    { key: "work", label: "업무처리" },
    { key: "ops",  label: "운영" },
    { key: "analytics", label: "분석" },
  ]}
  active={activeTab}
  onChange={setActiveTab}
/>
```

Renders a horizontal tab strip matching the existing design system (`border-b border-divider/70`, active state uses `text-ink font-medium` + bottom border). State is local to the page component (no URL param needed for MVP).

---

## Files to Create / Modify

| File | Action | Summary |
|------|--------|---------|
| `web/src/pages/OpsPage.tsx` | CREATE | New Ops page — TmsExceptionBanner + DeliveryNotes + MultiTo + Dayoung + WMS placeholder |
| `web/src/components/ui/page-tabs.tsx` | CREATE | Reusable horizontal sub-tab strip |
| `web/src/pages/TmsPage.tsx` | MODIFY | Wrap content in PageTabs; distribute widgets to 3 sub-tabs |
| `web/src/pages/WmsPage.tsx` | MODIFY | Add PageTabs; [분석] tab gets AutoResearchTrend + AutoResearchLog |
| `web/src/pages/HomePage.tsx` | MODIFY | Remove TmsKpi, AutoResearchTrend, AutoResearchLog, AgentFeed, SyncHealth |
| `web/src/pages/LogPage.tsx` | MODIFY | Add AgentFeed + SyncHealth below existing widgets |
| `web/src/App.tsx` | MODIFY | Add `/ops` route + "Ops" NavLink between Home and TMS |

---

## Widget Relocation Map

| Widget | From | To |
|--------|------|----|
| TmsKpi | Home | TMS [운영] |
| AutoResearchTrend | Home | WMS [분석] |
| AutoResearchLog | Home | WMS [분석] |
| AgentFeed | Home | Log |
| SyncHealth | Home | Log |
| TmsExceptionBanner | TMS (top) | TMS [운영] + Ops |
| TmsDeliveryNotes | TMS | TMS [업무처리] + Ops |
| TmsMultiTo | TMS | TMS [업무처리] + Ops |
| TmsDayoungSchedule | TMS | TMS [업무처리] + Ops |
| TmsCarrierRanking | TMS | TMS [분석] |
| TmsOtifTrend | TMS | TMS [분석] |
| TmsDailyVolume | TMS | TMS [분석] |
| TmsPodAging | TMS | TMS [운영] |

---

## Verification

1. `cd web && npx tsc --noEmit` — 0 errors
2. `npm run build` — succeeds
3. Visual: `/` — only Tasks + SimpleTodo, no KPI or AutoResearch widgets
4. Visual: `/ops` — ExceptionBanner + DeliveryNotes + MultiTo + Dayoung in order
5. Visual: `/tms` — sub-tab strip visible; [업무처리] default; clicking [운영] shows TmsKpi+ExceptionBanner+PodAging; [분석] shows charts
6. Visual: `/wms` — sub-tab strip; [분석] tab shows AutoResearchTrend + AutoResearchLog
7. Visual: `/log` — AgentFeed + SyncHealth appear below existing log widgets
8. Nav: "Ops" link appears between "Home" and "TMS" in header
