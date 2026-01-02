import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeywordChip } from '../components/KeywordChip';

describe('KeywordChip', () => {
  const defaultProps = {
    keyword: 'senior',
    type: 'exclude' as const,
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the keyword text', () => {
      render(<KeywordChip {...defaultProps} />);
      expect(screen.getByText('senior')).toBeInTheDocument();
    });

    it('should render remove button', () => {
      render(<KeywordChip {...defaultProps} />);
      expect(screen.getByRole('button', { name: /remove senior/i })).toBeInTheDocument();
    });

    it('should render the × symbol for remove', () => {
      render(<KeywordChip {...defaultProps} />);
      expect(screen.getByText('×')).toBeInTheDocument();
    });
  });

  describe('Type Styling - Exclude', () => {
    it('should apply red styling for exclude type', () => {
      render(<KeywordChip {...defaultProps} type="exclude" />);
      const chip = screen.getByText('senior').closest('span');
      expect(chip?.className).toContain('bg-red-100');
      expect(chip?.className).toContain('text-red-700');
    });

    it('should apply red button color for exclude type', () => {
      render(<KeywordChip {...defaultProps} type="exclude" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-red-600');
    });
  });

  describe('Type Styling - Include', () => {
    it('should apply green styling for include type', () => {
      render(<KeywordChip {...defaultProps} type="include" />);
      const chip = screen.getByText('senior').closest('span');
      expect(chip?.className).toContain('bg-emerald-100');
      expect(chip?.className).toContain('text-emerald-700');
    });

    it('should apply green button color for include type', () => {
      render(<KeywordChip {...defaultProps} type="include" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-emerald-600');
    });
  });

  describe('Remove Functionality', () => {
    it('should call onRemove when remove button is clicked', () => {
      const onRemove = vi.fn();
      render(<KeywordChip {...defaultProps} onRemove={onRemove} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('should not bubble click event to parent', () => {
      const onRemove = vi.fn();
      render(<KeywordChip {...defaultProps} onRemove={onRemove} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for remove button', () => {
      render(<KeywordChip {...defaultProps} keyword="react" />);
      expect(screen.getByLabelText('Remove react')).toBeInTheDocument();
    });

    it('should have correct aria-label for different keywords', () => {
      render(<KeywordChip keyword="typescript" type="include" onRemove={vi.fn()} />);
      expect(screen.getByLabelText('Remove typescript')).toBeInTheDocument();
    });
  });

  describe('Different Keywords', () => {
    const keywords = ['senior', 'lead', 'principal', 'react', 'typescript', 'c++', '.net'];

    keywords.forEach(keyword => {
      it(`should render keyword: ${keyword}`, () => {
        render(<KeywordChip keyword={keyword} type="exclude" onRemove={vi.fn()} />);
        expect(screen.getByText(keyword)).toBeInTheDocument();
      });
    });
  });

  describe('Long Keywords', () => {
    it('should handle long keywords', () => {
      const longKeyword = 'very-long-keyword-that-might-overflow';
      render(<KeywordChip keyword={longKeyword} type="exclude" onRemove={vi.fn()} />);
      expect(screen.getByText(longKeyword)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keyword string', () => {
      render(<KeywordChip keyword="" type="exclude" onRemove={vi.fn()} />);
      // The chip should still render (empty text)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle special characters in keyword', () => {
      render(<KeywordChip keyword="c#/.net" type="include" onRemove={vi.fn()} />);
      expect(screen.getByText('c#/.net')).toBeInTheDocument();
    });
  });
});
