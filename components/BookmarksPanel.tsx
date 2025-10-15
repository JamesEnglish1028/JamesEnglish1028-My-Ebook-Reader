import React from 'react';

export interface Bookmark {
	id: string;
	label: string;
	cfi: string;
	created: string;
}

interface BookmarksPanelProps {
	bookmarks: Bookmark[];
	onNavigate: (cfi: string) => void;
	onDelete: (id: string) => void;
	isOpen: boolean;
	onClose: () => void;
}

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({ bookmarks, onNavigate, onDelete, isOpen, onClose }) => {
	if (!isOpen) return null;
	return (
		<aside
			className="fixed top-0 right-0 h-full w-80 bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bookmarks-heading"
		>
			<div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
				<h3 id="bookmarks-heading" className="text-xl font-semibold text-white">Bookmarks</h3>
				<button onClick={onClose} aria-label="Close bookmarks panel" className="p-2 rounded-full hover:bg-slate-700">
					<span aria-hidden>×</span>
				</button>
			</div>
			<div className="flex-grow overflow-y-auto p-4">
				{bookmarks.length === 0 ? (
					<div className="text-slate-400 text-center">No bookmarks yet.</div>
				) : (
					<ul className="space-y-2">
						{bookmarks.map(bm => (
							<li key={bm.id} className="flex items-center justify-between bg-slate-700 rounded p-2">
								<button
									className="text-left flex-1 text-white hover:underline"
									onClick={() => onNavigate(bm.cfi)}
									aria-label={`Go to bookmark: ${bm.label}`}
								>
									<div className="font-medium">{bm.label}</div>
									<div className="text-xs text-slate-400">{new Date(bm.created).toLocaleString()}</div>
								</button>
								<button
									className="ml-2 p-2 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
									onClick={() => onDelete(bm.id)}
									aria-label={`Delete bookmark: ${bm.label}`}
								>
									🗑️
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</aside>
	);
};

export default BookmarksPanel;
