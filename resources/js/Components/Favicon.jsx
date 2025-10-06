import { useEffect } from 'react';
import appLogo from '../../applogo.png';

const Favicon = () => {
    useEffect(() => {
        // Set favicon dynamically
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = appLogo;
        document.getElementsByTagName('head')[0].appendChild(link);
    }, []);

    return null;
};

export default Favicon;