import React from 'react';

interface EmptyStateProps {
  /** Type of empty state to display */
  variant: 'library' | 'catalog' | 'error';
  /** Custom title (optional) */
  title?: string;
  /** Custom message (optional) */
  message?: string;
  /** Error message (for error variant) */
  error?: string;
}

/**
 * EmptyState - Display message when no content is available
 * 
 * Shows contextual messages for different empty states:
 * - library: No books in local library
 * - catalog: No books/categories in catalog
 * - error: Error loading content
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  message,
  error,
}) => {
  // Default messages based on variant
  const getDefaultContent = () => {
    switch (variant) {
      case 'library':
        return {
          title: 'Your library is empty.',
          message: 'Import your first book or add a catalog to get started!',
          textColor: 'text-white',
        };
      case 'catalog':
        return {
          title: 'Empty Section',
          message: 'No categories or books were found here.',
          textColor: 'text-white',
        };
      case 'error':
        return {
          title: 'Error Loading Source',
          message: error || 'An unexpected error occurred.',
          textColor: 'text-red-400',
        };
      default:
        return {
          title: 'No Content',
          message: 'Nothing to display here.',
          textColor: 'text-white',
        };
    }
  };

  const defaultContent = getDefaultContent();
  const displayTitle = title || defaultContent.title;
  const displayMessage = message || defaultContent.message;
  const titleColor = variant === 'error' ? 'text-red-400' : defaultContent.textColor;

  return (
    <div className="text-center py-20 bg-slate-800 rounded-lg">
      <h2 className={`text-2xl font-semibold ${titleColor}`}>
        {displayTitle}
      </h2>
      <p className="text-slate-300 mt-2 max-w-xl mx-auto">
        {displayMessage}
      </p>
    </div>
  );
};

export default EmptyState;
