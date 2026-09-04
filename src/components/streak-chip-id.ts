// The one place this id is written for the React side of the chip.
//
// Its pair is src/components/StreakChipSlot.astro, which renders the element. The
// two are meant to be read together: if the markup stops rendering the element the
// portal silently has nowhere to go, which is why every migrated page carries a
// build test asserting the element ships.
export const STREAK_CHIP_ID = 'streakChip';
