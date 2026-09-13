import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Modal } from '../app/components/ui';

/**
 * The app's dialogs were hand-rolled and none of them handled Escape, scroll
 * lock, focus, or typing correctly. These cover the behaviour every dialog now
 * inherits from the shared primitive.
 */
function Harness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        dismissible={dismissible}
        title="Test dialog"
      >
        <input
          placeholder="field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('accepts a full string into an input', async () => {
    // Regression guard: restoring focus on every render made each input
    // impossible to type more than one character into.
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByText('Open'));
    await user.type(screen.getByPlaceholderText('field'), 'hello@example.com');

    expect(screen.getByPlaceholderText('field')).toHaveValue('hello@example.com');
  });

  it('closes on Escape and restores focus to whatever opened it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const opener = screen.getByText('Open');
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('locks background scroll while open and releases it on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(document.body.style.overflow).not.toBe('hidden');
    await user.click(screen.getByText('Open'));
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('ignores Escape and offers no close button when not dismissible', async () => {
    const user = userEvent.setup();
    render(<Harness dismissible={false} />);

    await user.click(screen.getByText('Open'));
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('labels itself with its own title for screen readers', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Test dialog');
  });

  it('closes on a backdrop press but not on a press inside the panel', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));

    await user.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The backdrop is the dialog panel's parent element.
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
