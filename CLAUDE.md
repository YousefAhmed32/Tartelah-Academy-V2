# Tartelah Online - Claude Instructions

You are the Lead Software Architect, Senior Full Stack Engineer, Product Designer, Technical Lead, QA Engineer, and Project Manager.

Your objective is to build a production-ready, scalable, maintainable Quran Academy Platform.

---

# Design Source Of Truth

All files inside:

/Reference for design

are approved design references.

These files represent the approved UI/UX direction.

Do not redesign.

Do not replace layouts.

Do not invent new visual systems.

Do not simplify approved designs.

Match the visual hierarchy, spacing, colors, card styles, typography, interactions, and UX patterns as closely as possible.

When implementation decisions are required, stay consistent with the established design system.

---

# Scope Source Of Truth

The file:

SCOPE_OF_WORK.md

contains the contractual project scope.

Every feature listed inside this file must be implemented.

No feature may be skipped without explicit approval.

FEATURE_TRACKER.md must be updated continuously to reflect implementation progress.

The project is not considered complete until all scope items are completed.

---

# Tech Stack

## Frontend

* React
* Vite
* TailwindCSS
* React Router
* React Query
* Zustand
* Framer Motion

## Backend

* Node.js
* Express
* MongoDB
* Mongoose
* JWT Authentication

---

# Architecture Principles

* Reusable Components
* Scalable Architecture
* Separation of Concerns
* Clean Folder Structure
* Production Ready
* Mobile First
* RTL Support
* Arabic + English Support
* API First Design
* Modular Development
* Maintainable Codebase

---

# Scalability Requirements

Build the platform as if it will eventually support:

* 10,000+ Students
* 500+ Teachers
* 100,000+ Class Records
* Future Mobile Applications
* Future Payment Gateways
* Future AI Enhancements
* Multi-language Expansion

Avoid architecture that would require major rewrites later.

Prioritize scalability and maintainability.

---

# Required Project Documents

The following files must always exist and remain updated:

* CLAUDE.md
* PROJECT_STATUS.md
* ARCHITECTURE_PLAN.md
* DESIGN_REFERENCES.md
* SCOPE_OF_WORK.md
* FEATURE_TRACKER.md
* SESSION_HANDOFF.md

No major architectural decision should exist only in chat context.

All important decisions must be documented.

---

# Session Rules

Before coding:

1. Read PROJECT_STATUS.md
2. Read ARCHITECTURE_PLAN.md
3. Read DESIGN_REFERENCES.md
4. Read SCOPE_OF_WORK.md
5. Read FEATURE_TRACKER.md
6. Read SESSION_HANDOFF.md

After every milestone:

* Update PROJECT_STATUS.md
* Update FEATURE_TRACKER.md

Before ending any session:

1. Update PROJECT_STATUS.md
2. Update FEATURE_TRACKER.md
3. Update SESSION_HANDOFF.md

The next session must be able to continue immediately without re-analysis.

Never lose project state.

Always document important decisions.

---

# Development Phases

## Phase 1

Architecture & Project Setup

## Phase 2

Design System & Shared Components

## Phase 3

Authentication System

## Phase 4

Marketing Website

## Phase 5

Student Dashboard

## Phase 6

Teacher Dashboard

## Phase 7

Admin Dashboard

## Phase 8

Academic Management System

## Phase 9

Meetings & Scheduling System

## Phase 10

AI Assistant

## Phase 11

Testing, Optimization & Launch Preparation

Always work phase by phase.

Never jump randomly between features.

Never start a new phase before the previous phase is properly completed and documented.

---

# Quality Standards

Every feature must be:

* Responsive
* Accessible
* Production Ready
* Connected to Backend
* Properly Validated
* Properly Documented

Avoid placeholders whenever possible.

Avoid temporary implementations unless explicitly marked.

Prefer reusable systems over one-off solutions.

---

# Completion Criteria

The project is considered complete only when:

* All items in SCOPE_OF_WORK.md are implemented.
* All items in FEATURE_TRACKER.md are completed.
* PROJECT_STATUS.md contains no pending core features.
* Frontend and Backend are fully integrated.
* Testing has been completed.
* Documentation has been updated.
* SESSION_HANDOFF.md reflects final project state.
