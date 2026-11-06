import "fake-indexeddb/auto";
import { saveProfile } from "../db/profile";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { confirmDay } from "../db/db";
import { deleteHabit } from "../db/habits";
import type { Habit } from "../domain/types";
import {
  applyRemote,
  clearLocalData,
  getSyncState,
  setSyncState,
} from "./outbox";

const habit = (id: string): Habit =>
  ({
    id,
    name: id,
    direction: "constructive",
    active: true,
    createdAt: 0,
    versions: [
      { from: "2026-01-05", tier: "medium", rule: { kind: "boolean" } },
    ],
  }) as unknown as Habit;

const outbox = async () =>
  (await db.outbox.toArray()).map((o) => `${o.tbl}:${o.key}`).sort();

beforeEach(async () => {
  await clearLocalData();
});

describe("outbox", () => {
  it("saveProfile enqueues ('profile','me'); clearLocalData clears profile", async () => {
    await saveProfile({ name: "A" }, new Date(1));
    expect((await db.outbox.toArray()).map((o) => [o.tbl, o.key])).toEqual([["profile", "me"]]);
    await clearLocalData();
    expect(await db.profile.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it("plain put/update/delete enqueue", async () => {
    await db.habits.put(habit("a"));
    expect(await outbox()).toEqual(["habits:a"]);
    const first = (await db.outbox.toArray())[0].changedAt;
    expect(typeof first).toBe("number");
    await db.habits.update("a", { name: "b" });
    await db.habits.delete("a");
    expect(await outbox()).toEqual(["habits:a"]);
    await db.outbox.clear();
    await db.habits.bulkPut([habit("x"), habit("y")]);
    await db.habits.clear();
    expect(await outbox()).toEqual(["habits:x", "habits:y"]);
  });

  it("confirmDay enqueues the review", async () => {
    await confirmDay("2026-01-06", {}, new Date("2026-01-07T08:00:00"));
    expect(await outbox()).toEqual(["reviews:2026-01-06"]);
  });

  it("deleteHabit enqueues habit, events and touched reviews", async () => {
    await db.habits.put(habit("h"));
    await db.events.put({ id: "e1", habitId: "h", day: "2026-01-06" } as never);
    await db.reviews.put({
      day: "2026-01-06",
      entries: { h: { kind: "value", value: true } },
      confirmedAt: 1,
      revision: 1,
    } as never);
    await db.outbox.clear();
    await deleteHabit("h");
    expect(await outbox()).toEqual([
      "events:e1",
      "habits:h",
      "reviews:2026-01-06",
    ]);
  });

  it("explicit transaction without outbox enqueues", async () => {
    await db.transaction("rw", db.habits, async () => {
      await db.habits.put(habit("t"));
    });
    expect(await outbox()).toEqual(["habits:t"]);
  });

  it("a rolled back transaction leaves no outbox row", async () => {
    await expect(
      db.transaction("rw", db.habits, async () => {
        await db.habits.put(habit("r"));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await outbox()).toEqual([]);
  });

  it("applyRemote writes do not enqueue", async () => {
    await applyRemote(async () => {
      await db.habits.put(habit("p"));
      await db.reviews.delete("nope");
    });
    expect(await db.habits.get("p")).toBeTruthy();
    expect(await outbox()).toEqual([]);
  });

  it("applyRemote refuses to nest inside another transaction", async () => {
    await expect(
      db.transaction("rw", [db.habits, db.outbox, db.syncState], () =>
        applyRemote(async () => {}),
      ),
    ).rejects.toThrow("applyRemote must not run inside");
  });

  it("clearLocalData wipes everything without enqueueing", async () => {
    await db.habits.put(habit("c"));
    await setSyncState({ userId: "u", cursor: 5 });
    await clearLocalData();
    expect(await db.habits.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    expect(await getSyncState()).toEqual({ id: "state", cursor: 0 });
  });

  it("syncState helpers merge patches", async () => {
    await setSyncState({ userId: "u" });
    await setSyncState({ cursor: 3 });
    expect(await getSyncState()).toEqual({
      id: "state",
      userId: "u",
      cursor: 3,
    });
  });
});

describe("main-v3 -> v4 upgrade", () => {
  it("keeps data and the upgrade does not enqueue", async () => {
    db.close();
    await Dexie.delete("life-elo");
    const old = new Dexie("life-elo");
    old.version(1).stores({
      habits: "id, active",
      events: "id, habitId, day",
      reviews: "day",
      wellbeing: "day",
      rewards: "id, kind, status",
    });
    old.version(2).stores({});
    old.version(3).stores({ profile: "id" });
    await old.open();
    await old.table("habits").put(habit("keep"));
    await old.table("profile").put({ id: "me" });
    old.close();

    await db.open();
    expect((await db.habits.get("keep"))?.id).toBe("keep");
    expect((await db.profile.get("me"))?.id).toBe("me");
    expect(await db.outbox.count()).toBe(0);
  });
});
