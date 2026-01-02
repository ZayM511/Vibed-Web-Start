import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterToggle } from '../components/FilterToggle';

describe('FilterToggle', () => {
  const defaultProps = {
    icon: '👻',
    label: 'Ghost Job Detection',
    description: 'Filter out likely ghost jobs',
    checked: false,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render icon', () => {
      render(<FilterToggle {...defaultProps} />);
      expect(screen.getByText('👻')).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<FilterToggle {...defaultProps} />);
      expect(screen.getByText('Ghost Job Detection')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<FilterToggle {...defaultProps} />);
      expect(screen.getByText('Filter out likely ghost jobs')).toBeInTheDocument();
    });

    it('should render toggle button', () => {
      render(<FilterToggle {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Toggle States', () => {
    it('should show unchecked state correctly', () => {
      const { container } = render(<FilterToggle {...defaultProps} checked={false} />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv?.className).toContain('bg-gray-50');
    });

    it('should show checked state correctly', () => {
      const { container } = render(<FilterToggle {...defaultProps} checked={true} />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv?.className).toContain('bg-blue-50');
    });
  });

  describe('Toggle Interaction', () => {
    it('should call onChange when clicked (unchecked -> checked)', () => {
      const onChange = vi.fn();
      render(<FilterToggle {...defaultProps} checked={false} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange when clicked (checked -> unchecked)', () => {
      const onChange = vi.fn();
      render(<FilterToggle {...defaultProps} checked={true} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('should NOT call onChange when disabled and clicked', () => {
      const onChange = vi.fn();
      render(<FilterToggle {...defaultProps} disabled={true} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled styles', () => {
      const { container } = render(<FilterToggle {...defaultProps} disabled={true} />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv?.className).toContain('opacity-50');
      expect(outerDiv?.className).toContain('cursor-not-allowed');
    });

    it('should disable the button', () => {
      render(<FilterToggle {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Different Filter Types', () => {
    it('should render staffing filter toggle', () => {
      render(
        <FilterToggle
          icon="🏢"
          label="Staffing Agency Filter"
          description="Hide staffing/recruiting firm posts"
          checked={true}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByText('🏢')).toBeInTheDocument();
      expect(screen.getByText('Staffing Agency Filter')).toBeInTheDocument();
    });

    it('should render remote verification toggle', () => {
      render(
        <FilterToggle
          icon="🌍"
          label="Remote Verification"
          description="Verify remote jobs are truly remote"
          checked={false}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByText('🌍')).toBeInTheDocument();
      expect(screen.getByText('Remote Verification')).toBeInTheDocument();
    });
  });
});
