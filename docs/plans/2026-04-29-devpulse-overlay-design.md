# DevPulse AI — Overlay Product Design

**Date:** 2026-04-29
**Status:** Approved by product stakeholder
**Version:** 1.0

---

## Product Definition

**DevPulse AI** is a read-only intelligence overlay that connects to your team's existing tools
(GitHub, Jira, Monday, Slack) and uses AI to answer the one question every engineering manager
has every morning:

> *"Is my team on track — and if not, why, and what should I do about it?"*

DevPulse does **not** replace Jira, Monday, or GitHub. It sits on top of them and translates
everything happening across those tools into plain-English decisions for managers, VPs, and CTOs.

**The one-sentence pitch:**
> Connect your tools once. From that moment on, DevPulse tells you what's on track, what's at
> risk, and what the consequences are — without you opening a single dashboard.

---

## USP — The Ripple Effect

Every engineering intelligence tool shows dependencies as lines on a chart.
DevPulse shows them as **consequences**.

When a security review is unscheduled today, DevPulse traces the full chain:

```
Auth Blocker (today, Q2)
  → Payment Gateway Phase 2 blocked (Q3)
      → Enterprise Tier Launch at risk (Q4)
          → Sales season window missed by 6 weeks
```

This transforms the roadmap from a static document into a **living simulation**. A CTO can
justify boring infrastructure work to a CEO not because "it's on the roadmap" but because
"if we don't do it this week, our Q4 revenue target moves to Q1 next year."

No other tool in the market does this.

---

## The 3 Design Principles

Every screen, every element, must pass these three tests before shipping:

### 1. The "So What?" Principle
Every graph must have a text insight next to it. Data is never shown alone. The format is:

```
[What happened]  →  [Why it happened]  →  [What you should do]
```

Example (bad): "Velocity: 34 points (↓18%)"
Example (good): "Velocity dropped 18% this sprint — caused by 14 hrs of meetings per developer.
                 Not a performance issue. Protect Tuesday/Thursday as no-meeting days."

### 2. The 5-Second Rule
If a manager can't understand the status of a $2M project within 5 seconds, the design failed.
- Health Score (0–100) is the anchor of every screen
- Traffic light color (🔴 🟡 🟢) communicates status before any reading
- Insights are sorted by impact: Needs Action → Watch → On Track

### 3. Context Over Metrics
Never report a metric without explaining its cause. Causes fall into these categories:
- **Process gap** (blocked review, missing approval)
- **Capacity gap** (overloaded developer, missing hire)
- **Dependency gap** (waiting on another team or system)
- **Scope gap** (too many stories committed)
- **External factor** (meeting-heavy week, incident response)

The AI must identify the category, not just the number.

---

## Target Users

All three roles use DevPulse with the same screens, but the AI adapts the scope of its insights:

| Role | Scope | Primary question | Check frequency |
|---|---|---|---|
| Engineering Manager | Their team | "Who needs attention today?" | Daily |
| VP of Engineering | Their org (multiple teams) | "Which team is at risk?" | Daily + weekly |
| CTO / Head of R&D | Full company | "Are we hitting business goals?" | Weekly |

Role is detected at login. The same 6 screens serve all three — the AI scope changes, not the UI.

---

## Integration Architecture

### Connection model
All integrations use **OAuth 2.0** — one-click authorization, no API keys, no manual setup.
Access is **read-only**. DevPulse never writes to any connected tool.

### Supported integrations (v1)

| Tool | Data pulled | Used for |
|---|---|---|
| GitHub / GitLab | Commits, PRs, reviews, cycle time | Developer activity, burnout signals, velocity |
| Jira | Sprints, issues, epics, blockers, roadmap | Sprint health, roadmap, ripple effect |
| Monday.com | Boards, timelines, items, status | Sprint health, roadmap |
| Linear | Cycles, issues, priorities | Sprint health, roadmap |
| Slack / Teams | Message volume, after-hours patterns | Burnout signals (optional, privacy-aware) |

### First-connect behavior
1. User clicks "Connect [Tool]" → OAuth approval → done (30 seconds)
2. DevPulse pulls **last 12 months** of history automatically
3. AI builds baseline: velocity, delivery patterns, team rhythm, dependency graph
4. Within minutes: full historical timeline + live insights active
5. Webhooks registered for real-time updates going forward — no polling, no manual refresh

### Ongoing sync
Real-time via webhooks. Every PR merge, task status change, sprint update, and blocker
flag flows into DevPulse instantly. No scheduled jobs, no "last updated 2 hours ago."

---

## Screen Designs

### Screen 1: Connect (Onboarding)

The first screen after signup. Clean, step-by-step.

**Layout:**
- One integration per row
- Status: Not Connected / Connecting / Connected + last sync time
- Each row: logo, name, what data it reads, one-click connect button
- Progress indicator: "3 of 5 tools connected — insights improving"

**After all tools connected:**
- AI runs initial analysis (30–90 seconds)
- User lands on Today screen with first briefing ready

---

### Screen 2: TODAY (Daily Briefing)

**Purpose:** Replace the Monday morning team check-in. One screen that tells you what matters.

**Anchor (always visible at top):**
```
[Day, Date · Week # · Quarter · X weeks to quarter end]
COMPANY HEALTH    [Score]/100    [🔴/🟡/🟢 STATUS]
"[One-line summary of the most important thing happening today]"
```

**Body — insights grouped by impact:**

**🔴 NEEDS ACTION** (expanded by default)
Each item format:
```
[Bold headline — the problem]
Cause: [Why it's happening — category: process/capacity/dependency/scope/external]
→ Recommended action: [Specific, doable step]
[Action button if applicable — deep-links to the tool]
```

**🟡 WATCH** (expanded by default)
Same format, lower urgency. No action required today but monitor.

**🟢 ON TRACK** (collapsed by default)
Single line: "Frontend, Mobile, Data teams on track. 24 stories completed this week."
Expandable for those who want the detail.

**Drill-down:** Every item opens a side panel with full detail. No page navigation.

**Role adaptation:**
- Manager: insights scoped to their team only
- VP: insights grouped by team, sorted by risk
- CTO: insights grouped by initiative/quarter, sorted by business impact

---

### Screen 3: SPRINT HEALTH

**Purpose:** Answer "Will we finish the sprint, and what's in the way?"

**Anchor:**
```
[Sprint name · Day X of Y]
SPRINT HEALTH    [Score]/100    [STATUS]
"Predicted completion: X% of committed stories"
```

**Split layout — chart left, AI right (always paired):**

Left: Burndown chart (ideal line vs actual line)
Right: AI box containing:
- What the chart shows in one sentence
- Why the gap opened (root cause + date it started)
- What happens if not addressed
- Recommended action

Rule: **No chart is ever shown without its AI companion box.**

**Team breakdown table:**
Columns: Team | Health Score | Status | One-line AI note
One click on any row → side panel with that team's full sprint story

**Blockers section:**
Each blocker shows:
- Title + time blocked
- Business impact (sprint delay in days)
- Action buttons (deep-link to Jira/Monday + suggested action)

---

### Screen 4: ROADMAP (Quarterly View)

**Purpose:** Show the quarter's initiatives as a simplified Gantt, with AI overlaying consequence chains.

**Anchor:**
```
[Quarter · Week range · Weeks remaining]
ROADMAP HEALTH    [Score]/100    [STATUS]
"[Number] active blocker(s) on your critical path to [next major milestone]"
```

**The Gantt:**
- Epic/initiative level only — never individual tasks
- Horizontal bars across the quarter (and preview of next quarter)
- Color coding: 🟢 On track · 🟡 At risk · 🔴 Delayed · Gray: Completed · Dotted: Predicted impact
- Completed history (last quarter) shown as context on the left

**Click on any bar → side panel:**
- Initiative name, owner, original target, predicted completion
- AI explanation: why it's at its current status
- AI consequence: what happens downstream if it stays delayed
- Deep-link to Jira/Monday to take action

**The Ripple Effect Panel (right side of screen):**
The signature feature. Always visible when any 🔴 item exists on the roadmap.

Layout: vertical chain of consequence cards, connected by arrows.

Each card:
```
[Risk icon]  [Initiative name]  [Timeframe]
[One-line consequence explanation]
```

Cards connected top-to-bottom by arrows labeled with the dependency type
(e.g., "requires completion of ↑", "blocks start of ↓").

At the bottom of the chain: the business consequence
(e.g., "Q4 launch moves from October → November. Sales season window missed.")

Design requirement for the Ripple Effect:
- Maximum 4 cards in a single chain (deeper chains get summarized)
- No lines crossing — strictly vertical, no branching in the panel
- Color gradient: gets more red as you go down the chain
- One "Resolve this now" CTA at the top that deep-links to the root cause

---

### Screen 5: ANNUAL VIEW (Year at a Glance)

**Purpose:** The CTO/VP view. Are we going to hit our yearly business goals?

**Anchor:**
```
[FY Year · Current date · Week X of 52]
ANNUAL HEALTH    [Score]/100    [STATUS]
"On track for X of Y annual objectives. [Quarter] is your highest-risk quarter."
```

**Four-column layout (one per quarter):**

Each quarter column:
- Quarter label + health score + status color
- List of 3–5 major initiatives with status icons
- "X/Y complete" or "X/Y on track" summary
- Click to expand → shows initiative detail

**AI Annual Briefing panel (below the four columns):**
Three sections:
1. 🔴 HIGH RISK — initiatives where current trajectory misses the annual goal, with full reasoning
2. 🟡 WATCH — initiatives that need attention but are recoverable
3. 🟢 SAFE — brief summary of what's healthy (keeps it positive without noise)

Final line: Year-end prediction
```
"At current velocity: X/Y objectives delivered by December.
To hit Y/Y: [2–3 specific actions]."
```

**Variables the AI considers for annual health:**
- Sprint velocity trends
- Hiring pace vs hiring plan (headcount is a delivery variable)
- Dependency chains across quarters
- Historical delivery accuracy (does this team tend to be optimistic?)
- Seasonal factors (Q4 holidays, sales cycles)

Including hiring pace acknowledges that software is built by people, not Jira tickets.
Including sales season context acknowledges that engineering serves business outcomes.

---

### Screen 6: TEAM HEALTH

**Purpose:** The human layer. Who is struggling, and why?

**Anchor:**
```
TEAM HEALTH    [Score]/100    [STATUS]
"[X] developers showing elevated risk signals"
```

**Per-developer cards — the "Human Element":**

Format (not just a red dot):
```
[Name]  [Risk level: Healthy / Watch / At Risk / Critical]

Why:
- [Specific signal 1, e.g., "11 consecutive working days"]
- [Specific signal 2, e.g., "34% of commits after 9pm"]
- [Specific signal 3, e.g., "No PTO in 6 weeks"]

Recommended 1:1 talking point:
"Check in on workload and energy. Don't mention the data directly —
ask open questions about what feels manageable right now."
```

The 1:1 talking point gives the manager **emotional intelligence**, not just a red alert.
This is the feature that makes DevPulse feel human.

**Team-level aggregation:**
- Team health score (average of member scores, weighted by risk level)
- Trend: improving / stable / declining over last 4 weeks
- Most common risk factor across the team (e.g., "Meeting load is the top stressor this week")

---

## What Is NOT In Scope (v1)

To keep the product focused and shippable:

- ❌ Writing to Jira/Monday (read-only always)
- ❌ Time tracking or individual performance scoring
- ❌ Code quality metrics (not the domain of this product)
- ❌ Hiring/recruiting workflows
- ❌ Budget or financial tracking
- ❌ Customer-facing metrics (NPS, support tickets)
- ❌ AI that takes actions autonomously (suggests only, never acts)

DevPulse is a **decision support tool**, not an automation engine.

---

## Competitive Position

| | LinearB | Jellyfish | DevPulse AI |
|---|---|---|---|
| Shows metrics | ✅ | ✅ | ✅ |
| Explains metrics in plain English | ❌ | ❌ | ✅ |
| Traces consequence chains | ❌ | ❌ | ✅ (Ripple Effect) |
| Per-developer burnout with human context | ❌ | ❌ | ✅ |
| Role-aware AI scope | ❌ | Partial | ✅ |
| Hiring pace as roadmap variable | ❌ | ❌ | ✅ |
| Business outcome context (sales seasons) | ❌ | ❌ | ✅ |
| Price accessibility (non-enterprise) | Partial | ❌ | ✅ (target) |

---

## Summary

DevPulse wins by being the only tool that answers **"So what does this mean for the business?"**
not just **"Here is what happened."**

The Ripple Effect is the killer feature. Burnout intelligence with human context is the
emotional differentiator. Role-aware AI scope makes it serve the $50/month manager and
the enterprise CTO simultaneously.

The product is intentionally narrow in v1 — read-only, overlay, insight-first. That
narrowness is the product's strength, not its weakness.
