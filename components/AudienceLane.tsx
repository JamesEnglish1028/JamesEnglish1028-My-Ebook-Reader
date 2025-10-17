import React from 'react';

import type { CatalogNavigationLink } from '../types';

interface AudienceLaneProps {
  audienceLinks: CatalogNavigationLink[];
  onNavigate: (url: string) => void;
}

export const AudienceLane: React.FC<AudienceLaneProps> = ({ audienceLinks, onNavigate }) => {
  if (!audienceLinks.length) return null;
  return (
    <div className="audience-accordion sidebar-accordion">
      <div className="sidebar-accordion-header">Audience</div>
      <ul className="sidebar-accordion-list">
        {audienceLinks.map(link => (
          <li key={link.url}>
            <button className="sidebar-link" onClick={() => onNavigate(link.url)}>
              {link.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AudienceLane;
