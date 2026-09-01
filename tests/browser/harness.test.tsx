import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

function StreakChip({ days }: { days: number }) {
  return <span role="status">{days}-day streak</span>;
}

test('renders a React component in a real browser', async () => {
  const screen = await render(<StreakChip days={3} />);
  await expect.element(screen.getByRole('status')).toBeVisible();
  await expect.element(screen.getByText('3-day streak')).toBeVisible();
});
