import {
  DINING_DAY_LABELS,
  formatDiningWeekLabel,
  MEAL_PERIODS,
  resolveDiningMenuForPlayer,
  WEEKDAY_KEYS,
} from "../../lib/digitalDashboard.js";
import { signageMealItemPx } from "../../lib/displaySignage.js";

const AFTA_RED = "#c8102e";

const MEAL_EMOJI = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
};

/**
 * @param {{
 *   dining: Record<string, unknown> | null | undefined,
 *   menuSnapshot?: Record<string, unknown> | null,
 *   diningMenuId?: string,
 *   menusById?: Record<string, Record<string, unknown>>,
 *   title?: string,
 *   compact?: boolean,
 * }} props
 */
export default function DiningWeekSlideView({
  dining,
  menuSnapshot,
  diningMenuId = "",
  menusById = {},
  title = "Dining Services",
  compact = false,
}) {
  const payload = resolveDiningMenuForPlayer({
    dining,
    menuSnapshot,
    diningMenuId,
    menusById,
  });
  const week = Array.isArray(payload?.week) ? payload.week : [];
  const hasMenuItems = week.some((day) =>
    day.meals?.some((meal) => meal.items?.length),
  );
  const maxMealItems = week.reduce(
    (max, day) =>
      Math.max(
        max,
        ...(day.meals || []).map((meal) => meal.items?.length || 0),
      ),
    1,
  );
  const mealItemPx = signageMealItemPx(maxMealItems);
  const hasFooter = Boolean(payload?.dietaryNotices?.length || payload?.specialEvents?.length);

  if (!payload || (!hasMenuItems && payload.weekend && week.length === 0)) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-16 text-center"
        style={{
          background: `linear-gradient(145deg, ${AFTA_RED} 0%, #8b0a1f 55%, #1a1a1a 100%)`,
        }}
      >
        <img
          src="/afta-logo.png"
          alt="Arkansas Fire Training Academy"
          className="mb-6 h-[120px] w-[120px] object-contain drop-shadow-lg"
        />
        <p className="text-[16px] font-bold uppercase tracking-[0.35em] text-white/90">{title}</p>
        <h2 className="mt-4 text-[56px] font-extrabold tracking-tight text-white">
          {payload?.name || dining?.name || "Campus dining closed"}
        </h2>
        <p className="mt-4 max-w-3xl text-[24px] text-white/85">
          Weekly menus are served Monday through Friday. See you Monday for the next feast!
        </p>
      </div>
    );
  }

  const weekLabel = formatDiningWeekLabel(String(payload.weekStartDate || ""));
  const displayWeek =
    week.length > 0
      ? week
      : WEEKDAY_KEYS.map((key) => ({
          key,
          label: DINING_DAY_LABELS[key],
          meals: MEAL_PERIODS.map(({ key: mealKey, label }) => ({
            key: mealKey,
            label,
            items: [],
          })),
        }));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white text-black">
      <header
        className="relative z-10 flex h-[100px] shrink-0 items-center gap-5 px-8 shadow-lg"
        style={{ background: `linear-gradient(90deg, ${AFTA_RED} 0%, #a50d26 100%)` }}
      >
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-md">
          <img src="/afta-logo.png" alt="Arkansas Fire Training Academy" className="h-full w-full object-contain" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-white/90">{title}</p>
          <h1 className="truncate text-[40px] font-extrabold leading-none tracking-tight text-white">
            {payload.name || "Weekly Menu"}
          </h1>
          <p className="mt-1 text-[15px] font-semibold text-white/80">
            What&apos;s cookin&apos; this week? Bon appétit!
          </p>
        </div>

        {weekLabel ? (
          <div className="shrink-0 rounded-2xl border-2 border-white/40 bg-white px-5 py-2 text-center shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-wider text-black/50">Week of</p>
            <p className="text-[18px] font-extrabold leading-tight" style={{ color: AFTA_RED }}>
              {weekLabel}
            </p>
          </div>
        ) : null}
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-5 gap-3 overflow-hidden p-4">
        {displayWeek.map((day) => (
          <DayColumn
            key={day.key}
            day={day}
            compact={compact}
            mealItemPx={mealItemPx}
          />
        ))}
      </div>

      {!hasMenuItems ? (
        <p className="relative z-10 h-[36px] shrink-0 truncate px-8 text-center text-[18px] font-medium text-black/50">
          No menu items entered for this week yet. Add meals in Digital Dashboard → Dining.
        </p>
      ) : null}

      {hasFooter ? (
        <footer
          className="relative z-10 h-[44px] shrink-0 overflow-hidden border-t-4 px-8"
          style={{ borderColor: AFTA_RED, backgroundColor: "#fafafa" }}
        >
          <div className="flex h-full items-center gap-8 truncate text-[16px] text-black/80">
            {payload.dietaryNotices?.length ? (
              <div className="truncate">
                <span className="font-extrabold uppercase tracking-wide" style={{ color: AFTA_RED }}>
                  Dietary{" "}
                </span>
                {payload.dietaryNotices.join(" · ")}
              </div>
            ) : null}
            {payload.specialEvents?.length ? (
              <div className="truncate">
                <span className="font-extrabold uppercase tracking-wide" style={{ color: AFTA_RED }}>
                  Special{" "}
                </span>
                {payload.specialEvents.join(" · ")}
              </div>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   day: { key: string, label: string, isToday?: boolean, meals?: { key: string, label: string, items?: string[] }[] },
 *   compact?: boolean,
 *   mealItemPx: number,
 * }} props
 */
function DayColumn({ day, compact = false, mealItemPx }) {
  const isToday = Boolean(day.isToday);
  const label =
    day.label ||
    day.key?.charAt(0).toUpperCase() + day.key?.slice(1);

  return (
    <article
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 shadow-md ${
        isToday
          ? "border-[#c8102e] bg-[#c8102e] shadow-lg shadow-[#c8102e]/25 ring-2 ring-[#c8102e]/30"
          : "border-black/10 bg-white"
      }`}
    >
      <div
        className={`flex h-[58px] shrink-0 flex-col items-center justify-center ${
          isToday ? "bg-white" : "border-b-2 border-[#c8102e]/20 bg-[#c8102e]"
        }`}
      >
        <p
          className={`text-[20px] font-extrabold uppercase tracking-wide ${
            isToday ? "text-black" : "text-white"
          }`}
        >
          {label}
        </p>
        {isToday ? (
          <span
            className="mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white"
            style={{ backgroundColor: AFTA_RED }}
          >
            Today
          </span>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-3 gap-2 overflow-hidden bg-white p-2">
        {(day.meals || []).length ? (
          day.meals.map((meal, index) => (
            <MealBlock
              key={meal.key}
              meal={meal}
              compact={compact}
              mealItemPx={mealItemPx}
              showDivider={index > 0}
            />
          ))
        ) : (
          <p className="col-span-full flex items-center justify-center text-[16px] italic text-black/40">
            No items
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * @param {{
 *   meal: { key: string, label: string, items?: string[] },
 *   compact?: boolean,
 *   mealItemPx: number,
 *   showDivider?: boolean,
 * }} props
 */
function MealBlock({ meal, compact = false, mealItemPx, showDivider = false }) {
  const items = meal.items || [];
  const emoji = MEAL_EMOJI[meal.key] || "✨";

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${
        showDivider ? "border-t-2 border-dashed border-black/10 pt-2" : ""
      }`}
    >
      <p
        className="mb-1 flex shrink-0 items-center gap-1.5 text-[14px] font-extrabold uppercase tracking-wide"
        style={{ color: AFTA_RED }}
      >
        <span aria-hidden className="text-[16px]">
          {emoji}
        </span>
        {meal.label}
      </p>
      {items.length ? (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
          {items.map((item) => (
            <li
              key={`${meal.key}-${item}`}
              className="truncate font-medium leading-tight text-black"
              style={{ fontSize: `${mealItemPx}px` }}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] italic text-black/35">—</p>
      )}
    </div>
  );
}
