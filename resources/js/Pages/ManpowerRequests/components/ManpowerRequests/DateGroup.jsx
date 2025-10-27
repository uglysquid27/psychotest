import { useState, useMemo } from 'react';
import RequestItem from './RequestItem';

export default function DateGroup({ date, requests, formatDate, getStatusClasses, onDelete, onRevision, isUser, isAdmin }) {
  const [isOpen, setIsOpen] = useState(false);

  const [localRequests, setLocalRequests] = useState(requests); // state lokal

  const groupedBySubSection = useMemo(() => {
    const groups = localRequests.reduce((acc, req) => {
      const key = req.sub_section?.name || 'N/A';
      if (!acc[key]) acc[key] = [];
      acc[key].push(req);
      return acc;
    }, {});

    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => {
        const aShift = (a.shift_id ?? (typeof a.shift === 'number' ? a.shift : undefined)) ?? 999;
        const bShift = (b.shift_id ?? (typeof b.shift === 'number' ? b.shift : undefined)) ?? 999;
        if (aShift !== bShift) return aShift - bShift;
        const aCreated = new Date(a.created_at || 0).getTime();
        const bCreated = new Date(b.created_at || 0).getTime();
        return aCreated - bCreated;
      });
    });

    return Object.entries(groups).sort(([aName], [bName]) => aName.localeCompare(bName));
  }, [localRequests]);

  // delete lokal
  const handleDelete = (id) => {
    setLocalRequests(prev => prev.filter(r => r.id !== id));
    if (onDelete) onDelete(id);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{formatDate(date)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
          {localRequests.length} request{localRequests.length !== 1 ? 's' : ''}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {groupedBySubSection.map(([subName, subRequests]) => (
            <div key={subName} className="bg-gray-50 dark:bg-gray-900/30">
              <div className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {subName} <span className="font-normal text-gray-500 dark:text-gray-400">• {subRequests.length}</span>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {subRequests.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    formatDate={formatDate}
                    getStatusClasses={getStatusClasses}
                    onDelete={isAdmin ? () => handleDelete(request.id) : null}
                    onRevision={isAdmin ? () => onRevision?.(request.id) : null}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}