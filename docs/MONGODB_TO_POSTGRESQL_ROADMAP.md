# MongoDB to PostgreSQL Migration Roadmap

## 1. Goal and guiding decisions

Migrate the backend persistence layer from MongoDB/Mongoose to PostgreSQL without changing public API behavior, approval rules, document history, or downloadable artifacts. The migration should be reversible until the final cutover and should not require the frontend to know which database is active.

**Recommended target stack**

- PostgreSQL 16+ in the target deployment environment.
- A typed migration-capable ORM such as Prisma, with SQL migrations committed to the repository. Keep complex reporting queries in reviewed SQL where that is clearer than ORM expressions.
- A repository/service persistence boundary between controllers and database code.
- `pg` connection pooling and transaction scopes owned by request/application services, never by controllers.
- Keep existing Mongo `_id` values as a stable external `legacy_id` during migration. Use generated UUID primary keys for new relational rows only if the API contract permits it; otherwise use text primary keys during the transition and defer identifier changes.

**Non-goals for the first cutover**

- Redesigning workflow rules described in `feedback.md`.
- Changing API field names, response shapes, authorization policy, PDF layout, or S3/upload behavior.
- Deleting Mongo data immediately after cutover.

## 2. Current-state findings

The repository is a TypeScript/Express API with a Next.js frontend in `requisite/`. The root backend currently depends on `mongoose` and has no PostgreSQL driver or ORM. The main database connection is in `src/config/database.ts`, but persistence is not isolated there.

The migration surface includes these model areas:

- Users, departments, locations, vendors, and vendor categories.
- Requisitions, items, requisition history, and item history.
- RFQs, purchase orders, bids, deliveries, GRNs, and JCFs.
- Comments, notifications, and the counter used by `src/utils/idGenerator.ts`.

Important coupling to remove before data migration:

- Controllers call Mongoose queries and `.populate()` directly.
- Approval and fulfillment flows use `mongoose.startSession()` for multi-record transactions.
- Utilities call `mongoose.model()` dynamically, including notification and requisition-routing code.
- ObjectId validation and conversion are shared through `src/utils/objectIdHelper.ts` and repeated in controllers.
- Embedded arrays such as approvals, items, history, and quote metadata need explicit relational ownership and ordering.
- Existing shell/JavaScript checks connect directly with `MONGODB_URI`; those checks will need a database-neutral API test path or PostgreSQL fixtures.

## 3. Target relational shape

Use singular domain tables with foreign keys, explicit status constraints, and append-only audit records. Preserve historical/compatibility columns until API consumers have moved.

| Mongo area | PostgreSQL target | Migration notes |
|---|---|---|
| `User` | `users` | Preserve employee ID and role values; FK to `departments` and optional vendor. |
| `Department` | `departments` | Unique normalized code/name; FK for head where applicable. |
| `Location` | `locations` | Keep full address columns; support nullable legacy fields. |
| `Vendor`, `VendorCategory` | `vendors`, `vendor_categories`, `vendor_category_links` | Use controlled category IDs and uniqueness constraints. |
| `Requisition` | `requisitions` | Scalar fields in table; requester, department, location, status, timestamps as FKs/columns. |
| `items[]` | `requisition_items` | Stable `position`; `is_work_tool` boolean; preserve legacy item ID. |
| approval arrays/assignments | `requisition_approvals`, `po_approvals`, `approval_assignments` | One row per assignment/decision; immutable decision timestamp; unique idempotency key. |
| requisition/item history | `requisition_history`, `item_history` | Append-only, actor/time/action/payload; JSONB payload only for compatibility details. |
| `RFQ` | `rfqs`, `rfq_items`, `rfq_vendors`, `rfq_snapshots` | Snapshot immutable item/vendor/address data at issue/download boundaries. |
| `PurchaseOrder` | `purchase_orders`, `purchase_order_lines`, `po_quotes`, `po_snapshots` | Distinguish requisition-linked and PM-added lines; store calculation breakdown. |
| delivery/GRN/JCF | `deliveries`, `grns`, `grn_items`, `jcfs` | Enforce approved-PO eligibility. |
| comments | `comments` | Self-FK for parent comment; FKs to author and resource. |
| notifications | `notifications`, `notification_deliveries` | Unique event key for idempotency and delivery retry state. |
| counter | `number_sequences` | Replace read-modify-write counter logic with row locking or PostgreSQL sequence. |

Use `jsonb` only for data that is genuinely document-shaped, such as historical audit payloads or provider metadata. Do not use JSONB to avoid modeling relationships, approvals, line items, or searchable fields.

## 4. Work phases

### Phase 0: Baseline and migration contract

1. Inventory every Mongoose model, index, enum, default, hook, virtual, population, aggregation, and transaction.
2. Capture API contract fixtures for auth, requisition, approval, RFQ, PO, GRN, JCF, comments, notifications, and downloads.
3. Record representative Mongo documents, including legacy/null/missing fields and large approval histories. Remove secrets from fixtures.
4. Define identifier policy, timezone/precision rules, deletion policy, tenant boundary, and compatibility behavior for deprecated fields.
5. Define reconciliation metrics: row counts, per-status counts, relationship counts, financial totals, and sampled API response equivalence.

**Exit gate:** baseline tests and a signed mapping/compatibility matrix exist before schema work begins.

### Phase 1: Introduce the persistence boundary

1. Create domain types that do not import Mongoose types or expose `ObjectId`.
2. Add repositories for users/access, master data, requisitions, RFQs, POs, fulfillment, comments, and notifications.
3. Move authorization predicates, status transitions, approval idempotency, and transaction orchestration into services.
4. Replace controller `.populate()` calls with explicit repository read models/projections.
5. Introduce an application `UnitOfWork` abstraction so Mongo sessions and PostgreSQL transactions implement the same contract.
6. Keep Mongo as the only adapter initially and run the existing API regression suite.

**Exit gate:** controllers and utilities no longer directly import Mongoose; behavior remains unchanged.

### Phase 2: Build PostgreSQL schema and adapter

1. Add PostgreSQL configuration, pool health checks, migration scripts, and local Docker/dev setup.
2. Create normalized tables, constraints, indexes, foreign keys, and seed/reference data.
3. Implement PostgreSQL repositories behind the same interfaces as Mongo repositories.
4. Add transaction tests for requisition submission, approval, RFQ issuance, PO approval, PO edits, GRN finalization, and JCF approval.
5. Add query plans for high-volume list/detail/filter endpoints and indexes for status, requester, department, assignee, vendor, dates, and foreign keys.

**Exit gate:** PostgreSQL passes repository contract tests and can serve the API in an isolated environment with seeded data.

### Phase 3: Extract and transform data

1. Freeze the mapping version and take a consistent Mongo backup/snapshot.
2. Extract in dependency order: master data, users, requisitions/items, history/approvals, RFQs, POs/quotes, fulfillment records, comments, and notifications.
3. Convert ObjectId references through a durable `legacy_id -> relational_id` map, never by positional assumptions.
4. Preserve array order with `position` and preserve missing versus null semantics where API behavior depends on them.
5. Normalize dates to UTC and money to `numeric` with an explicit currency/scale policy.
6. Import parent rows before children, quarantine invalid/orphaned records, and produce an exception report rather than silently dropping them.
7. Backfill derived summary fields only when supported by approval/history evidence; leave unknown values null.

**Exit gate:** counts, relationship integrity, status distributions, financial totals, and sampled API fixtures reconcile with Mongo.

### Phase 4: Shadow reads and controlled dual operation

1. Run PostgreSQL writes from a replay/import environment first; do not dual-write live business mutations until reconciliation is reliable.
2. Add a feature flag for read selection by endpoint or tenant/environment.
3. For safe read endpoints, query both stores asynchronously, compare normalized responses, and log only identifiers/field diffs.
4. For live dual-write, write PostgreSQL as the target of record and publish an outbox event for Mongo compatibility writes, or use a carefully monitored synchronous adapter. Do not pretend two independent commits are atomic.
5. Monitor latency, error rate, transaction conflicts, orphan counts, sequence collisions, and response diffs.

**Exit gate:** shadow-read differences are understood and below an agreed threshold for a sustained observation window; all critical write paths have a rollback procedure.

### Phase 5: Cutover

1. Announce a short write freeze or maintenance window for final delta capture.
2. Stop schedulers and workers that can mutate data; drain queues and record in-flight work.
3. Apply the final Mongo delta, reconcile, and take a final backup.
4. Switch the feature flag/configuration to PostgreSQL, then run startup, health, auth, list/detail, approval, RFQ, PO, download, GRN, JCF, notification, and scheduler smoke tests.
5. Keep Mongo read-only and retained for the agreed rollback period. Roll back by switching reads/writes only if PostgreSQL integrity or critical API behavior fails the cutover gate.

**Exit gate:** business owner accepts reconciliation and smoke-test evidence; no critical API or authorization regression remains open.

### Phase 6: Decommission Mongo

1. Observe PostgreSQL-only production through the retention period.
2. Remove Mongoose imports, Mongo-specific sanitization/error handling, `MONGODB_URI`, direct-Mongo auto-tests, and unused dependencies.
3. Archive the final Mongo backup and migration logs according to retention policy.
4. Remove compatibility columns only through separately reviewed migrations after API consumers have moved.
5. Update `GEMINI.md`, `README.md`, environment examples, deployment configuration, and operational runbooks.

## 5. Validation strategy

- **Repository contract tests:** run the same create/read/update/transition tests against Mongo and PostgreSQL adapters during the transition.
- **API compatibility tests:** compare status codes, validation errors, authorization outcomes, response fields, pagination, sorting, and ISO timestamp serialization.
- **Workflow tests:** verify atomic approval transitions, duplicate/idempotent decisions, rejection/resubmission, PO approval/download gates, and GRN/JCF eligibility.
- **Data reconciliation:** compare counts, foreign-key coverage, approval histories, item ordering, totals, and sampled canonical JSON.
- **Performance checks:** capture baseline latency and query plans for dashboard and list endpoints before enabling PostgreSQL reads.
- **Failure tests:** kill/restart the database, retry transactions, interrupt imports, replay outbox events, and verify no partial business transition is exposed.

## 6. Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Hidden Mongoose behavior in controllers/utilities | Complete Phase 1 boundary work and search for Mongoose imports before adapter cutover. |
| Embedded arrays lose order/history | Dedicated child tables with position/order and append-only records. |
| ObjectId/API identifier incompatibility | Durable legacy ID map and compatibility serialization until clients migrate. |
| Mongo allows inconsistent/orphaned data | Quarantine and report exceptions; do not weaken relational constraints to force import. |
| Dual-write divergence | Prefer target-of-record plus outbox; reconcile continuously; keep rollback switch. |
| Transaction semantics change | Contract-test every current session/transaction path and use explicit isolation/locking. |
| Financial totals change due to numeric/rounding differences | Use PostgreSQL `numeric`, define scale/rounding, and compare historical totals before cutover. |
| Large documents or history cause slow import | Batch by dependency, use COPY where safe, checkpoint progress, and retry idempotently. |
| Downloaded documents change after migration | Snapshot RFQ/PO source data and compare PDF fixtures before and after. |

## 7. Suggested delivery order

1. Baseline tests and mapping contract.
2. Persistence interfaces and Mongo adapter.
3. Relational schema plus PostgreSQL adapter.
4. Master data and requisition migration.
5. RFQ/PO and approval migration.
6. GRN/JCF, comments, notifications, and scheduler migration.
7. Shadow reads, reconciliation, and performance tuning.
8. Controlled cutover, observation, and Mongo decommission.

The first implementation milestone should be Phase 1, not schema generation: once persistence and transaction ownership are explicit, the remainder of the migration becomes testable in slices and the API contract remains protected.
