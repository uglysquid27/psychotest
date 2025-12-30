export default function Pagination({ links, className = '' }) {
    if (links.length <= 3) {
        return null;
    }

    const getPageNumber = (url) => {
        if (!url) return null;
        const match = url.match(/page=(\d+)/);
        return match ? parseInt(match[1]) : null;
    };

    const getPageLabel = (label) => {
        switch (label) {
            case '&laquo; Previous':
                return 'Previous';
            case 'Next &raquo;':
                return 'Next';
            default:
                return label;
        }
    };

    const currentPage = links.find(link => link.active)?.label;

    return (
        <nav className={`flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-0 ${className}`}>
            <div className="flex flex-1 justify-between sm:hidden">
                {links.map((link, index) => {
                    if (index === 0) {
                        return (
                            <a
                                key={index}
                                href={link.url || '#'}
                                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                                    link.active
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-500'
                                        : link.url
                                        ? 'text-gray-700 hover:bg-gray-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                dangerouslySetInnerHTML={{ __html: getPageLabel(link.label) }}
                            />
                        );
                    }
                    if (index === links.length - 1) {
                        return (
                            <a
                                key={index}
                                href={link.url || '#'}
                                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                                    link.active
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-500'
                                        : link.url
                                        ? 'text-gray-700 hover:bg-gray-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                dangerouslySetInnerHTML={{ __html: getPageLabel(link.label) }}
                            />
                        );
                    }
                    return null;
                })}
            </div>
            
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage || 1}</span>
                    </p>
                </div>
                <div>
                    <ul className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                        {links.map((link, index) => {
                            // Skip if it's the "..." separator
                            if (link.label.includes('...')) {
                                return (
                                    <li key={index}>
                                        <span className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                                            ...
                                        </span>
                                    </li>
                                );
                            }

                            // Style for active page
                            const isActive = link.active;
                            const isFirst = index === 0;
                            const isLast = index === links.length - 1;

                            return (
                                <li key={index}>
                                    <a
                                        href={link.url || '#'}
                                        className={`
                                            relative inline-flex items-center px-4 py-2 text-sm font-medium focus:z-20
                                            ${isFirst ? 'rounded-l-md' : ''}
                                            ${isLast ? 'rounded-r-md' : ''}
                                            ${isActive
                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                : link.url
                                                ? 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                                : 'text-gray-300 ring-1 ring-inset ring-gray-300 cursor-not-allowed'
                                            }
                                        `}
                                        aria-current={isActive ? 'page' : undefined}
                                        dangerouslySetInnerHTML={{ __html: getPageLabel(link.label) }}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </nav>
    );
}