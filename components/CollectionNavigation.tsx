import React from 'react';
import { Collection } from '../types';

interface CollectionNavigationProps {
  collections: Collection[];
  onCollectionClick: (collection: Collection) => void;
}

export const CollectionNavigation: React.FC<CollectionNavigationProps> = ({
  collections,
  onCollectionClick
}) => {
  if (collections.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-slate-800/30 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-3">Collections</h3>
      <div className="flex flex-wrap gap-2">
        {collections.map((collection, index) => (
          <button
            key={`${collection.title}-${index}`}
            onClick={() => onCollectionClick(collection)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <span>📂</span>
            {collection.title}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CollectionNavigation;