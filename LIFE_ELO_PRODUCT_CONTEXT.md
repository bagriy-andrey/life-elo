# Life Elo — Product Context & Design Brief

> **Status:** Agreed product direction and requirements, with explicitly unresolved algorithm and UX details.  
> **Audience:** Codex, Claude Code, Claude Design, product/design/engineering agents.  
> **Language:** Russian is the working language for this brief; product UI language is not yet decided.  
> **Purpose:** Single source of truth for the current concept. Do not mistake examples or proposals for finalized specifications.

## 1. Product vision

**Life Elo** is a personal habit, discipline, motivation and wellbeing application with a game-like, adaptive rating. The product should help a user find and sustain the lifestyle in which they feel energetic, clear-headed, confident, motivated to create, and generally well.

The user described experiencing seven days without personally unwanted habits and feeling dramatically better ('как выросли крылья'), while periods of repeated impulsive behaviors felt like a downward spiral. This is the motivating observation, **not** a scientifically established causal mechanism. The product should help test which behaviors actually correlate with improved subjective wellbeing over time.

**Core distinction:** This is not a generic task checklist or simple XP counter. The central rating should reflect behavior trends and aim to align with the user's *self-reported* wellbeing, without pretending to measure mental health or personal worth.

## 2. Agreed product principles

1. **Initial Life Elo = 0.** Ratings may be positive or negative. Do not initialize at 1000.
2. **Three habit impact tiers:** Weak / Medium / Strong (Слабая / Средняя / Сильная), for both constructive and destructive habits.
3. **Constructive habits:** completion can raise Elo; **noncompletion does not subtract Elo** (current decision).
4. **Destructive habits:** doing a tracked unwanted behavior or violating its chosen limit can lower Elo; successfully observing a chosen limit can contribute positively, with safeguards against farming points for habits that were never a real issue.
5. **Streaks matter strongly:** consecutive successful days/habit adherence can boost rating; repeated negative patterns can worsen it. Both need bounded multipliers/penalties to avoid runaway scores or demoralization.
6. **Daily finalization happens the NEXT MORNING**, not the evening of the same day. The user confirms the **previous day's** behaviors and limits so late-night activity and bedtime are included.
7. During the day users may log events, but these are provisional until next-morning review. Revisions should recompute results consistently, without duplicate rewards.
8. **Optional daily wellbeing questionnaire**, preferably available during morning review; skipping it has no penalty.
9. **Rewards:** Wishlist, Unlock Rewards, Surprise Reward are explicitly liked and part of scope.
10. **Rating and redeemable reward currency are separate:** spending on a gift should not lower Life Elo. The exact currency mechanics and costs are not yet decided.
11. **Personalized/adaptive rating** inspired by Elo, informed by personal history and trends; the actual formula and numerical weights are NOT agreed yet.
12. The user specifically requested to **postpone assigning point values and finalizing the habit list** until the conceptual model is ready.

## 3. User journey / onboarding

1. Register / sign in.
2. Choose personal goals (e.g., reduce impulsive behavior, improve energy, focus, sleep, consistency).
3. Select desired constructive habits and unwanted/destructive habits from a suggested catalog; create custom ones.
4. For each tracked habit, configure direction, Weak/Medium/Strong significance, and a measurable rule or threshold when relevant.
5. Add personal rewards to Wishlist; configure unlockable and surprise rewards.
6. Start at **Life Elo 0**.
7. Log actions optionally throughout the day.
8. **The following morning**, review and confirm yesterday, then finalize the day and update Elo, streaks, achievements, and reward progress.
9. Optionally fill out a short wellbeing check-in.
10. View trends, progress, rewards, and insights about behavior/wellbeing relationships.

## 4. Habit catalog — candidate items, NOT a finalized checklist

The user's original brainstorming included the following. Names and categorization should remain editable; avoid moralizing normal recreation, sexuality, or social interaction.

### 4.1 Destructive / personally unwanted behaviors (candidate catalog)

- Pornography (when the user has chosen to limit it).
- Masturbation outside personally chosen boundaries; **masturbation itself is not inherently harmful**.
- Impulsive food delivery.
- Unconsidered / impulsive purchases.
- Scrolling marketplaces without a purpose.
- Aimless YouTube / Shorts viewing.
- Excessive news consumption / doomscrolling.
- Smoking.
- Alcohol above a chosen limit.
- Going to bed after 23:00.
- Going to bed after 00:00 (must not double-charge with the previous bedtime rule).
- Waking up later than intended, interpreted with sleep adequacy in mind.
- Instagram over 15 minutes/day.
- Aimless Instagram use (avoid duplicate penalties for the same episode).
- Distracting chats/flirting that displace planned activities; **ordinary communication or dating is not inherently destructive**.
- Compulsive phone checking / scrolling.
- Gaming beyond chosen boundaries or instead of important commitments.
- Excessive sweets / overeating (not ordinary eating of dessert).
- Procrastination / repeated avoidance of important tasks.
- Excessive late-night screen use.

### 4.2 Constructive behaviors (candidate catalog)

- Any sport; gym workouts (avoid double rewards for the same session).
- Running, cycling, padel, other activities.
- Walking / walking outside for 30–60 minutes.
- Daily movement or step target.
- Morning mobility/stretching.
- Going to bed at a chosen time; getting adequate sleep.
- Waking up at a chosen time without sacrificing sleep.
- Work on a personal project.
- Learning / skill development / language study.
- Reading a book (duplicate 'reading' items consolidated).
- Deep work without distraction.
- Completing an important postponed task.
- Beginning the day without the phone.
- Ending the day without the phone.
- 30 minutes of deliberate low-stimulation reflection, with pencil and paper.
- Journaling or planning.
- Cooking food at home; balanced eating.
- Spending time in nature.
- In-person connection with friends/family, meaningful social activities.
- Rest/recovery when needed.
- A day adhering to all selected unwanted-habit limits ('clean day') — **important bonus concept**.
- Several consecutive successful days — **important streak bonus concept**.

**Note:** 'Clean day' should mean adherence to the user's *chosen, realistic* rules, not abstinence from every pleasurable activity. An unselected habit must not silently count as a failure or success.

## 5. Habit configuration model

Each selected habit should conceptually include:

- ID, display name, description and category.
- Direction: `constructive` or `destructive`.
- Impact tier: `weak`, `medium`, `strong`.
- Measurable success/violation rule (e.g., minutes, count, yes/no, time window).
- Tracking frequency / applicability (daily, specific days, weekly target, event-driven).
- Optional user-set threshold and personal rationale.
- Active/inactive state and effective date.
- Streak state and history.
- Event logs and confirmation status.

Do not assume every habit must be performed every day. For constructive habits, missing or not doing it is neutral under the current agreed rules.

## 6. Life Elo rating engine — agreed behavior, open math

### 6.1 Desired properties

- Initial value `R0 = 0`, signed integer or other suitable numeric representation.
- Rating changes after the next-morning confirmation of yesterday's data.
- Impact tier affects magnitude of changes.
- Both individual actions and daily aggregate adherence can matter.
- Streaks amplify relevant trends and reward milestones.
- Adaptive personalization based on the user's history is desirable.
- Avoid scoring inflation, duplicate credit, repeated logging exploits, and runaway negative spirals.
- Show explainability: why rating moved, which habits/streaks contributed, and which values are estimated.
- Allow editing a previously confirmed day and deterministically recalculating dependent ratings/streaks/rewards.
- Avoid automatic punishment for an unreported/missing day.

### 6.2 Conceptual calculation pipeline (NOT a finalized formula)

`confirmed previous-day data → per-habit outcomes → impact tier / intensity → daily aggregate → streak adjustment → personalized adjustment → Elo delta → updated Life Elo`

Possible high-level identity: `R(today) = R(yesterday) + daily_delta`. The actual numerical coefficients, limits, multipliers, treatment of frequency and expected outcomes, and whether to use literal Elo probability math remain **TBD**.

### 6.3 Important anti-double-counting examples

- Bedtime at 00:30 should not trigger separate penalties for both 'after 23:00' and 'after 00:00' unless deliberately modeled as a single escalating severity rule.
- A gym workout may count as sport for analytics but should not automatically earn two full rewards.
- Instagram opening and Instagram exceeding the daily time limit should not automatically double-penalize the same usage.
- Multiple occurrences in one day: whether to score per occurrence or aggregate intensity is **not yet decided**. A sensible candidate is daily aggregated severity with a cap, but do not treat it as agreed.

### 6.4 Streaks

- Positive streaks for consistent adherence to chosen restrictions and constructive behavior.
- Negative streaks for repeated violations.
- 'Clean day' and multi-day streaks should be meaningful achievements/bonuses.
- Consider separate adherence, growth and recovery streaks, but **these exact three types are proposals, not approved requirements**.
- A lapse should not erase all long-term progress or previously earned gifts.
- Rewards for 3/7/14/30/90 days were discussed as examples, not approved thresholds.

## 7. Next-morning daily review — explicitly agreed

- Users can record provisional actions during the day.
- The system finalizes **yesterday** during a review **the next morning**.
- Review should cover relevant chosen habit rules and previously logged activities, including events late at night.
- Provide outcomes such as complied / violated / not applicable / skip or unknown, where appropriate.
- Only confirmed data should drive final rating updates. Unconfirmed days remain pending and are not assumed clean.
- Skipping a review should not incur a rating penalty.
- Corrections to earlier days should be supported with recalculation and idempotent reward handling.
- A bedtime after midnight should be associated with the prior evening/night by a clearly defined day-boundary rule.

### Illustrative UX

Morning: “Как прошёл вчерашний день?” → review selected restrictions and logged actions → confirm → see Elo delta, streak changes, achievement/reward progress → optionally report current wellbeing.

## 8. Optional wellbeing check-in

Goal: capture the actual subjective state rather than assuming behavior equals happiness.

Candidate 1–10 ratings:

- Mood / overall wellbeing.
- Energy.
- Mental clarity / focus.
- Self-confidence / satisfaction with self.
- Sense of control over impulses.

Optional free-text notes and context (sleep, stress, events, reasons for lapses). Questionnaire should be fast (roughly 30–60 seconds), voluntary, and **not penalize missing answers**.

### Critical separation

- **Life Elo / behavioral consistency** is not a medical or mental-health score.
- **Wellbeing score** comes from the user's own responses.
- The system should study their association, highlight mismatches, and learn cautiously, not force a match by changing scores to validate a narrative.
- If the user feels bad while Elo is high, show the discrepancy instead of claiming they must feel good.
- The app should not shame users, present negative Elo as human worth, or imply abstaining from all pleasure is a requirement for wellbeing.
- With insufficient data, show low confidence and avoid causal claims.

## 9. Rewards system — agreed features

### 9.1 Wishlist (explicitly approved)

Users add desired gifts, purchases, activities, experiences and/or personal goals. Suggested fields: title, image, description, estimated real-world price, required Reward Coins, priority, status. Actual pricing scheme TBD.

### 9.2 Unlock Rewards (explicitly approved)

Some rewards require meeting an achievement/streak/milestone before becoming available, potentially in addition to currency requirements. Exact unlock criteria TBD.

### 9.3 Surprise Reward (explicitly approved)

User creates or approves a pool of possible rewards; when eligible, the app selects one randomly. Do not generate unexpected financial commitments. Exact eligibility, probability and cost rules TBD.

### 9.4 Currency separation

- Life Elo is a signed performance indicator and **not spendable**.
- Reward Coins are earned and redeemed; spending does **not** reduce Elo.
- Achievements/unlocks are separate milestones.
- Suggested optional features (not explicitly agreed): Reward Vault, reward history, budget cap, saving goals.
- Ensure a missed day does not retroactively revoke redeemed rewards.

## 10. Analytics and dashboard

Potential dashboard elements:

- Current signed Elo, change since last confirmed day, rating trend.
- Streaks (adherence, violations, milestones).
- Habit-level contributions to daily rating delta.
- Confirmed vs pending days.
- Optional wellbeing trend and comparison with Elo.
- Reward Coins balance, Wishlist progress, unlocks.
- Insights about personal correlations and confidence/coverage of data.
- Progress after a lapse: returning from negative Elo toward zero is still meaningful progress.

A personal 7-day challenge to reproduce and study the user's earlier positive experience is a promising idea, **not yet a finalized feature**.

## 11. UX and visual design guidance for Claude Design

### Product feel

- Modern, polished, calm, motivating, slightly game-like.
- Make the **signed Life Elo** the visual centerpiece; show `+`/`−` and a neutral zero state clearly.
- Celebrate sustainable progress without shame or alarmist negative-state design.
- Keep daily check-in and confirmation lightweight and mobile-first.
- Reward Center should feel tangible and desirable; clear Wishlist, Locked/Unlockable, Surprise tabs or sections.
- Show why a rating changed; avoid opaque 'AI magic'.
- Avoid over-gamification that encourages compulsive logging, obsessive score checking, or treating leisure as a failure.

### Screens to explore

1. Welcome / registration.
2. Goals and habit selection from catalog.
3. Configure habit (direction, tier, threshold, frequency).
4. Add rewards / Wishlist onboarding.
5. Home dashboard with Elo, trend, streaks, pending review.
6. Morning review of yesterday.
7. Optional wellbeing check-in.
8. Habit catalog and editing.
9. Rating history and explanations.
10. Reward Center: Wishlist / Unlock Rewards / Surprise Reward.
11. Insights / wellbeing correlations.
12. Settings / reminders / data editing.

### Critical states

- Brand-new user at `0 Elo`, no data.
- Positive rating, negative rating, and transition through zero.
- Pending/unconfirmed yesterday.
- Positive streak and broken streak / recovery.
- Missing optional wellbeing responses.
- Reward locked, unlocked, affordable, redeemed.
- Retroactively edited day with recalculated rating.

No specific branding, color palette, typography, illustration style or navigation pattern has been agreed; Claude Design should propose alternatives, not assume a final design system.

## 12. Implementation guidance for Codex / Claude Code

No implementation stack has been formally selected for this project. The user's background is React/Next.js/TypeScript, so a mobile-friendly web app or PWA is a plausible proposal, **not an agreed technical decision**.

Recommended architecture boundaries:

- Authentication / user preferences.
- Habit catalog and user-specific habit configurations.
- Event log and day review confirmation.
- Deterministic rating engine with versioned configuration.
- Streak and achievement engine.
- Reward currency ledger and redemption state.
- Wellbeing check-ins and analytics.
- Notifications/reminders (later).

Store rating changes in an auditable ledger with references to confirmed day, ruleset version, and source events. Ensure corrections can be replayed safely. Use date/time zone aware day boundaries. Keep the rating algorithm behind an interface so formulas can evolve without redesigning the app.

**Important:** Do not hardcode illustrative numbers from previous discussion (1000 starting Elo, +20/day, x2 streaks, 7-day reward prices, etc.). Only `0` starting rating and the three qualitative impact tiers are approved.

## 13. Decision log — what is settled vs open

### Confirmed

- Initial rating = **0**, signed positive/negative.
- Three habit tiers: **Weak, Medium, Strong**.
- Constructive noncompletion = **0 rating penalty**.
- Next-morning confirmation of **previous day** before final rating update.
- Positive and negative streaks materially affect rating.
- Optional daily wellbeing questionnaire.
- Wishlist, Unlock Rewards, Surprise Reward.
- Goal: correlate and, when possible, align rating with real subjective wellbeing without confusing the two.
- User selects habits from suggestions and can add their own.

### Open / requires discussion

- Exact scoring formula, base weights, multipliers, caps and Elo adaptation.
- Whether a single destructive habit repeated in one day is scored per occurrence or by total intensity.
- How much to reward a clean day vs individual adherence.
- Exact clean-day definition and negative-streak rules.
- Habit thresholds, categories, default tier assignment, and final catalog.
- Frequency of constructive habits and whether non-daily goals exist.
- Reward Coins earning rates, redemption prices, unlock conditions and surprise mechanics.
- Whether wellbeing directly modifies Elo or is only used for calibration/validation (recommend latter initially).
- How to treat missing/unknown data and very long gaps.
- Whether social/competitive features are desired (question was raised but not answered).
- Product name, languages, technical stack, visual identity, notifications and privacy settings.

## 14. Instructions to downstream AI agents

1. Treat this document as product context, **not** as permission to silently resolve open questions.
2. Preserve all confirmed decisions, especially `R0 = 0`, signed rating, neutral missed constructive habits, and **next-morning** review.
3. Clearly distinguish **confirmed requirements**, **proposals**, and **examples** in specs and mockups.
4. When designing, show the full loop: choose habits → live/log day → review yesterday tomorrow morning → rating/streak updates → reward progress → optional wellbeing insights.
5. Make habit severity and scoring explainable, user-adjustable, and non-punitive.
6. Keep the optional questionnaire optional, and separate self-reported wellbeing from behavioral metrics.
7. Ask before choosing numerical coefficients or declaring a final algorithm.
8. Optimize for a sustainable, motivating product, not a system that induces guilt, compulsive tracking or rigid abstinence from normal life.
