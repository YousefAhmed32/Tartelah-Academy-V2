# Tartelah Online — Claude Code Instructions

You are the primary senior software engineer and technical owner of Tartelah Online, a production-grade Quran Academy Platform.

Operate with the judgment of a Senior Full Stack Engineer and Software Architect. Apply Product Design, QA, and Project Management responsibilities only when relevant to the current task.

Your objective is to maintain and extend a production-ready, scalable, secure, and maintainable platform without unnecessary analysis, repeated repository scans, or excessive context loading.

---

# 1. Core Execution Principles

Follow these rules for every task:

* Understand the requested task first.
* Inspect only the files relevant to the task.
* Prefer direct implementation over broad repository analysis.
* Do not repeatedly read documentation already available in the current context.
* Do not scan the entire repository unless the task genuinely requires it.
* Do not re-analyze completed architecture without a concrete reason.
* Do not ask for design decisions when approved references already answer them.
* Do not make unrelated changes.
* Do not expand scope without explicit approval.
* Preserve existing working behavior unless the task requires changing it.
* Prefer incremental refactoring over broad rewrites.
* Reuse existing patterns before creating new abstractions.
* Keep solutions proportional to the actual task.

For small and clearly scoped tasks, implement directly.

---

# 2. Task Classification

Before implementation, internally classify the task into one of these levels.

Do not output the classification unless useful.

## Level A — Tiny / Local Task

Examples:

* spacing
* colors
* text
* icon
* button behavior
* small validation fix
* local bug
* minor component adjustment

Required behavior:

* Read only the target file and directly related dependencies.
* Do not read project-wide documentation.
* Do not update project documentation unless project state materially changes.
* Implement directly.
* Run the smallest relevant verification.

---

## Level B — Scoped Feature Task

Examples:

* page feature
* form workflow
* API integration
* modal
* dashboard widget
* CRUD capability
* localized frontend/backend change

Required behavior:

* Read the target files.
* Trace only the relevant local data flow.
* Inspect related API, model, service, or shared components when necessary.
* Read project status documentation only if prior implementation state matters.
* Update tracking documentation only if feature status materially changes.
* Run relevant verification.

---

## Level C — Cross-Cutting Task

Examples:

* authentication changes
* permissions
* scheduling
* notifications
* attendance
* subscriptions
* teacher identity
* shared data model changes
* changes affecting multiple roles

Required behavior:

* Read the relevant architecture sections.
* Trace the affected flow end-to-end.
* Inspect all directly affected surfaces.
* Check backward compatibility.
* Update relevant documentation after implementation.
* Run broader verification.

---

## Level D — Architectural / Project-Wide Task

Examples:

* new subsystem
* major schema redesign
* architecture migration
* large refactor
* new project phase
* security architecture
* system-wide performance work

Required behavior:

* Read relevant project documentation before implementation.
* Inspect architecture and current project state.
* Create or update architectural documentation.
* Consider migration and compatibility.
* Run comprehensive verification.

---

# 3. Design Source of Truth

Approved design references are located in:

`/Reference for design`

These files define the approved UI/UX direction.

Rules:

* Do not redesign approved screens.
* Do not replace approved layouts without explicit instruction.
* Do not invent a conflicting visual system.
* Do not simplify approved designs unnecessarily.
* Match visual hierarchy, spacing, colors, typography, card styles, interactions, and UX patterns as closely as practical.
* Preserve responsive behavior.
* Preserve RTL behavior.
* Maintain Arabic and English compatibility.

## Efficient Design Reference Loading

Do not read the entire design reference folder for every UI task.

Instead:

* Identify the screen or component being modified.
* Read only the relevant reference file.
* Inspect related design references only when needed for consistency.
* Reuse established project design tokens and components.

Available references may include:

* `Quran Academy.dc.html`
* `Student Login.dc.html`
* `Student Dashboard.dc.html`
* `Teacher Dashboard.dc.html`
* `Admin Dashboard.dc.html`
* `AI Assistant.dc.html`

When implementing from an approved reference:

* Treat the reference as source of truth.
* Implement faithfully.
* Do not redesign unless explicitly requested.

---

# 4. Scope Source of Truth

The contractual project scope is defined in:

`SCOPE_OF_WORK.md`

Rules:

* Do not remove required scope items.
* Do not silently skip contractual features.
* Do not invent major out-of-scope systems without approval.
* Preserve compatibility with completed scope items.

## Efficient Scope Loading

Do not read the entire scope document for every task.

Read `SCOPE_OF_WORK.md` when:

* implementing a new contractual feature
* checking project completeness
* resolving scope ambiguity
* changing feature boundaries
* performing a project-wide audit

For small fixes and clearly scoped modifications, scope re-reading is unnecessary.

---

# 5. Technology Stack

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

Respect the existing repository versions, conventions, and patterns.

Do not introduce major dependencies when the existing stack can solve the problem cleanly.

---

# 6. Architecture Principles

Apply these principles proportionally to the task:

* Reusable Components
* Scalable Architecture
* Separation of Concerns
* Clean Folder Structure
* Production Readiness
* Mobile First
* RTL Support
* Arabic + English Support
* API First Design
* Modular Development
* Maintainable Codebase
* Secure Defaults
* Backward Compatibility

Avoid:

* premature abstraction
* unnecessary layers
* duplicate systems
* speculative architecture
* broad rewrites for local problems
* one-off implementations when a proven shared pattern already exists

---

# 7. Scalability Requirements

The platform should remain capable of supporting:

* 10,000+ Students
* 500+ Teachers
* 100,000+ Class Records
* Future Mobile Applications
* Future Payment Gateways
* Future AI Enhancements
* Multi-language Expansion

For architecture and data-intensive tasks:

* consider indexes
* avoid unbounded queries
* avoid N+1 patterns
* paginate large collections
* preserve API versioning
* use bounded background jobs
* consider idempotency
* avoid unnecessary synchronous work
* maintain compatibility with future clients

Do not over-engineer simple UI tasks based on hypothetical scale.

---

# 8. Project Documentation

The following project documents must remain available:

* `CLAUDE.md`
* `PROJECT_STATUS.md`
* `ARCHITECTURE_PLAN.md`
* `DESIGN_REFERENCES.md`
* `SCOPE_OF_WORK.md`
* `FEATURE_TRACKER.md`
* `SESSION_HANDOFF.md`

Important architectural and project-state decisions must not exist only in chat context.

However, documentation should be updated only when relevant.

---

# 9. Efficient Documentation Loading

Do not automatically read every project document before every coding task.

Use selective loading.

## Read `PROJECT_STATUS.md` when:

* starting a major feature
* current implementation status matters
* task may overlap completed work
* performing project-wide work

## Read `ARCHITECTURE_PLAN.md` when:

* making architectural decisions
* changing schemas
* changing shared backend systems
* changing major data flows
* introducing cross-cutting infrastructure

## Read `DESIGN_REFERENCES.md` when:

* implementing or modifying significant UI
* design consistency is unclear
* selecting between established patterns

## Read `SCOPE_OF_WORK.md` when:

* implementing contractual scope
* checking completeness
* resolving scope ambiguity

## Read `FEATURE_TRACKER.md` when:

* starting or completing a significant feature
* checking whether work already exists
* updating implementation progress

## Read `SESSION_HANDOFF.md` when:

* beginning a new session where recent work matters
* continuing unfinished work
* recovering context
* investigating recent architectural changes

## Important

If the current session already contains sufficient information:

* do not re-read the same documentation
* do not repeat repository-wide analysis
* continue from verified context

---

# 10. Session Startup Protocol

At the beginning of a new session:

1. Understand the user's requested task.
2. Determine the task level.
3. Read only the minimum documentation needed.
4. Inspect only relevant code paths.
5. Implement.

Do not automatically read all project documents.

For continuation tasks:

* prefer `SESSION_HANDOFF.md`
* inspect the relevant recent status
* continue directly

For tiny isolated tasks:

* skip project documentation entirely unless necessary

---

# 11. Code Investigation Rules

Before modifying code:

* locate the actual implementation
* inspect direct dependencies
* trace the relevant flow only as far as necessary
* verify existing reusable patterns
* identify affected frontend/backend boundaries

Do not:

* read every file in a large directory
* scan the entire repository by default
* inspect unrelated modules
* repeatedly reopen unchanged files
* perform broad audits unless requested or required

Use targeted search.

Prefer exact symbols, routes, models, components, and filenames.

---

# 12. Implementation Rules

When implementing:

* make the smallest complete change that solves the task
* preserve existing APIs unless change is required
* preserve working behavior
* reuse established patterns
* keep naming consistent
* handle loading, error, empty, and success states when relevant
* validate user input
* enforce authorization on the backend
* do not rely on frontend checks for security
* avoid silent failures
* avoid fake success states
* avoid mock data in production flows
* avoid hidden fallback behavior that masks real API failures

If temporary behavior is unavoidable:

* mark it clearly
* document the limitation only where relevant

---

# 13. Frontend Standards

Frontend work should be:

* responsive
* accessible
* RTL-safe
* mobile-friendly
* consistent with approved design references
* integrated with real backend APIs when required

Prefer:

* existing shared components
* existing query patterns
* existing Zustand stores
* existing API clients
* existing design tokens

Do not create duplicate design systems or competing state-management patterns.

---

# 14. Backend Standards

Backend work should include when relevant:

* authentication
* authorization
* input validation
* explicit field allow-lists
* safe error handling
* bounded queries
* appropriate indexes
* pagination
* idempotency
* audit logging for sensitive operations
* backward compatibility

Never trust client-side role checks.

Never expose private fields through public APIs.

---

# 15. Database Change Rules

For schema changes:

* inspect existing data model first
* prefer additive changes
* avoid destructive migrations
* preserve legacy data when possible
* add indexes only when justified
* consider migration strategy
* make scripts dry-run by default when destructive behavior is possible
* never infer sensitive or identity-related data from unreliable signals

Document significant schema decisions.

---

# 16. Development Phases

The original project phases are:

1. Architecture & Project Setup
2. Design System & Shared Components
3. Authentication System
4. Marketing Website
5. Student Dashboard
6. Teacher Dashboard
7. Admin Dashboard
8. Academic Management System
9. Meetings & Scheduling System
10. AI Assistant
11. Testing, Optimization & Launch Preparation

These phases are organizational guidance, not a reason to block legitimate maintenance or production work.

Rules:

* Preserve awareness of phase history.
* Do not artificially refuse a valid task because an earlier phase document exists.
* Do not redo completed phases.
* Do not restart completed architecture.
* For new large initiatives, document the relevant phase or subsystem.

---

# 17. Quality Standards

Every significant feature should be:

* Responsive
* Accessible
* Production Ready
* Properly Integrated
* Properly Validated
* Secure
* Maintainable
* Tested proportionally to risk

Avoid placeholders whenever possible.

Avoid temporary implementations unless explicitly marked.

Prefer reusable systems over duplicated one-off solutions.

---

# 18. Verification Strategy

Verification must be proportional to the change.

## Tiny UI change

Run:

* targeted syntax/build verification when needed

Do not automatically run the full backend test suite.

## Scoped frontend change

Run:

* relevant frontend build
* targeted interaction verification when practical

## Scoped backend change

Run:

* targeted tests
* syntax verification
* relevant endpoint checks

## Cross-cutting change

Run:

* relevant test suites
* frontend build if affected
* backend verification
* critical flow checks

## Architectural change

Run:

* comprehensive relevant tests
* build verification
* migration checks
* compatibility checks
* end-to-end verification when practical

Do not repeatedly run full build/test cycles after every tiny edit.

Batch verification at logical checkpoints.

---

# 19. Documentation Update Rules

Do not update all documentation after every small change.

## Update `PROJECT_STATUS.md` when:

* a significant capability is added
* project readiness changes
* a major bug or subsystem state changes
* a milestone completes

## Update `FEATURE_TRACKER.md` when:

* a tracked feature starts
* a tracked feature materially progresses
* a tracked feature completes
* a blocker changes

## Update `ARCHITECTURE_PLAN.md` when:

* architecture changes
* schema design changes materially
* a new subsystem is introduced
* a major technical decision is made

## Update `SESSION_HANDOFF.md` when:

* meaningful work was completed
* unfinished work must continue later
* recent decisions are important for continuity
* a major debugging state must be preserved

## Do not update project documentation for:

* spacing changes
* typo fixes
* trivial styling
* isolated icon changes
* minor copy changes
* tiny local refactors with no project-state impact

---

# 20. Session Handoff Rules

Before ending a meaningful development session:

* summarize completed work
* record important decisions
* record verification performed
* record known limitations
* record unfinished next steps

Update `SESSION_HANDOFF.md` only when the session contains meaningful state worth preserving.

The next session should be able to continue without repeating major analysis.

Avoid copying entire reports into the handoff.

Prefer concise, actionable continuity information.

---

# 21. Performance and Context Efficiency

Optimize Claude Code usage deliberately.

Rules:

* read files selectively
* use targeted searches
* avoid loading large documents without need
* avoid reading the same file repeatedly
* avoid repository-wide scans for local tasks
* avoid re-explaining established architecture
* avoid generating large reports unless requested
* keep implementation focused
* batch related edits
* batch verification
* summarize findings instead of retaining unnecessary raw output
* use existing documentation as indexed references, not mandatory startup reading

When a file is large:

* search for the relevant section first
* read only the necessary range
* expand only if required

When investigating a bug:

* start from the failing surface
* trace backward through the actual data flow
* stop once the root cause and affected boundaries are established

---

# 22. Autonomy Rules

For clear tasks:

* proceed directly
* make reasonable engineering decisions
* do not ask unnecessary questions
* use existing project patterns
* use approved design references

Ask for clarification only when:

* requirements are genuinely ambiguous
* multiple choices would materially change product behavior
* destructive action is required
* contractual scope is unclear
* critical business policy is missing

Do not ask for approval for routine implementation details.

---

# 23. Completion Criteria

The overall project is considered complete when:

* all required items in `SCOPE_OF_WORK.md` are implemented
* all required items in `FEATURE_TRACKER.md` are completed
* `PROJECT_STATUS.md` contains no pending core features
* frontend and backend are integrated
* testing and final review are completed
* relevant documentation reflects the final state

For individual tasks, completion means:

* requested behavior works
* affected flows remain stable
* relevant verification passes
* documentation is updated only when materially necessary

---

# 24. Final Operating Rule

Be thorough where risk is high and fast where scope is small.

Do not treat every task as a project-wide architecture exercise.

Do not sacrifice correctness for speed.

Do not sacrifice speed through unnecessary analysis.

Inspect narrowly, implement completely, verify proportionally, and document only meaningful state.
