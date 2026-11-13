import { describe, expect, it } from "vitest";
import { coverage, deviceLastSyncAt, parseGarmin } from "./parse";
import dailysummary from "./fixtures/dailysummary.json";
import steps from "./fixtures/steps.json";
import sleep from "./fixtures/sleep.json";
import activities from "./fixtures/activities.json";

const raw = { steps, sleepByDate: sleep.responses, activities };

describe("parseGarmin", () => {
  const days = parseGarmin(raw);

  it("reads steps per date", () => {
    expect(days["2026-11-09"].steps).toBe(8987);
    expect(days["2026-11-11"].steps).toBe(13616);
  });

  it("uses local HH:MM from the Local timestamps (wake date)", () => {
    // 1794267547000 = 2026-11-09T23:39:07Z shifted -> local 23:39
    expect(days["2026-11-10"].sleepStart).toBe("23:39");
    expect(days["2026-11-10"].sleepEnd).toBe("08:19");
  });

  it("keeps a bedtime after midnight on its own date", () => {
    expect(days["2026-11-09"].sleepStart).toBe("01:16");
  });

  it("groups activities by local start date, minutes from duration", () => {
    expect(days["2026-11-11"].activities).toEqual([
      { type: "paddelball", minutes: 126 },
    ]);
    const types = days["2026-11-10"].activities.map((a) => a.type);
    expect(types).toContain("yoga");
    expect(types).toContain("strength_training");
    expect(
      days["2026-11-10"].activities.find((a) => a.type === "yoga")?.minutes,
    ).toBe(17);
  });

  it("has no activities on a day without any", () => {
    const d = parseGarmin({
      steps: [{ calendarDate: "2026-11-12", totalSteps: 5 }],
      activities: [],
    });
    expect(d["2026-11-12"].activities).toEqual([]);
  });

  it("tolerates missing sleep, empty bodies and bad items", () => {
    expect(parseGarmin(null)).toEqual({});
    expect(parseGarmin({})).toEqual({});
    expect(
      parseGarmin({
        steps: null,
        sleepByDate: { "2026-11-10": null, "2026-11-11": "" },
        activities: "x",
      }),
    ).toEqual({});
    const d = parseGarmin({
      steps: [
        { calendarDate: "2026-11-10" },
        null,
        { calendarDate: "2026-11-10", totalSteps: 0 },
      ],
      sleepByDate: { "2026-11-10": { calendarDate: "2026-11-10" } },
      activities: [
        { startTimeLocal: "2026-11-10 10:00:00", duration: 60 },
        { activityType: { typeKey: "yoga" } },
      ],
    });
    expect(d).toEqual({ "2026-11-10": { steps: 0, activities: [] } });
  });

  it("keeps only GarminDay fields", () => {
    for (const d of Object.values(days)) {
      expect(
        Object.keys(d).every((k) =>
          ["steps", "sleepStart", "sleepEnd", "activities"].includes(k),
        ),
      ).toBe(true);
      for (const a of d.activities)
        expect(Object.keys(a).sort()).toEqual(["minutes", "type"]);
    }
  });
});

describe("deviceLastSyncAt", () => {
  it("returns the latest day end as UTC ISO", () => {
    expect(deviceLastSyncAt(dailysummary)).toBe("2026-11-13T08:37:00.000Z");
  });
  it("tolerates missing or garbage", () => {
    expect(deviceLastSyncAt(null)).toBeUndefined();
    expect(deviceLastSyncAt({ data: 5 })).toBeUndefined();
    expect(
      deviceLastSyncAt({
        data: [
          {
            calendarDate: "2026-11-13",
            wellnessChronology: { endTimestampGmt: "x" },
          },
        ],
      }),
    ).toBeUndefined();
  });
});

describe("coverage", () => {
  it("flags steps/sleep and counts activities per day, including empty days", () => {
    const c = coverage(parseGarmin(raw), "2026-11-10", "2026-11-12");
    expect(c["2026-11-11"]).toEqual({
      steps: true,
      sleep: expect.any(Boolean),
      activities: 1,
    });
    expect(c["2026-11-12"]).toBeDefined();
    expect(Object.keys(c)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(coverage({}, "2026-01-01", "2026-01-01")["2026-01-01"]).toEqual({
      steps: false,
      sleep: false,
      activities: 0,
    });
  });
});
