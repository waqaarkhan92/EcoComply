/**
 * Button Component Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('should apply primary variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    
    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('bg-primary');
  });

  it('should apply danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    
    const button = screen.getByRole('button', { name: /danger/i });
    expect(button).toHaveClass('bg-danger');
  });
});

