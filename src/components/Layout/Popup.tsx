// Popup.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface PopupProps {
    isVisible: boolean;
    children: React.ReactNode;
    setVisible: (visible: boolean) => void;
}

const Popup: React.FC<PopupProps> = ({ isVisible, setVisible, children }) => {
    if (!isVisible) return null;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    };

    const popupStyle: React.CSSProperties = {
        backgroundColor: 'var(--colorLight',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,1)',
        maxHeight: '80%',
        overflowY: 'auto',
        padding: 0,
        margin: 0,
    };

    return (
        <motion.div style={overlayStyle} onClick={() => setVisible(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div style={popupStyle} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </motion.div>
    );
};

export default Popup;